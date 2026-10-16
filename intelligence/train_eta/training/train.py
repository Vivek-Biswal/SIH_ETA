"""Train an auditable station-landmark delay regressor on reported actual events.

No random row split, synthetic targets, aggregate-delay labels, or pickle runtime.
Run from repository root with the backend Python environment.
"""
import argparse
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'backend/services'))
from eta_features import FEATURE_VERSION, features, stamp, minutes, evaluate_trees


def build_samples(path, since='2025-01-01'):
    journeys=defaultdict(list)
    with Path(path).open(encoding='utf-8') as stream:
        for line in stream:
            event=json.loads(line)
            if event['journey_date'] >= since:
                journeys[(event['train_number'],event['journey_date'])].append(event)
    samples=[]; rejected=Counter()
    for (train, day), events in sorted(journeys.items()):
        events.sort(key=lambda r:r['sequence'])
        if len({e['sequence'] for e in events}) != len(events):
            rejected['ambiguous_sequence_journeys'] += 1; continue
        for i, current in enumerate(events[:-1]):
            for kind in ('arrival','departure'):
                actual=stamp(current.get('actual_'+kind)); reported=stamp(current.get('reported_at'))
                if not current.get(kind+'_confirmed') or actual is None or reported is None:
                    continue
                asof=max(actual,reported)
                if minutes(asof,actual) > 15:
                    rejected['late_report_landmarks'] += 1; continue
                for j in range(i+1,len(events)):
                    target=events[j]
                    ta, ts=stamp(target.get('actual_arrival')),stamp(target.get('scheduled_arrival'))
                    if not target.get('arrival_confirmed') or not ta or not ts or ta <= asof:
                        continue
                    row=features(train,day,events,i,j,asof,kind)
                    if row is None: continue
                    label=minutes(ta,ts)
                    if not -120 <= label <= 1440:
                        rejected['implausible_target_delay'] += 1; continue
                    samples.append({'features':row,'target':label,'asof':asof.isoformat(),'label_at':ta.isoformat(),
                                    'day':day,'journey':train+'/'+day,'train':train})
    return samples,dict(rejected)


def temporal_split(samples):
    """Whole origin dates, three-day embargo, and explicit label-time purge."""
    days=sorted({r['day'] for r in samples})
    if len(days)<40: raise ValueError('At least 40 distinct service dates are required.')
    boundaries=[days[int(len(days)*f)] for f in (.55,.70,.85)]
    def before(day, boundary):
        return day < (datetime.fromisoformat(boundary)-timedelta(days=3)).date().isoformat()
    groups={'train':[],'validation':[],'calibration':[],'test':[]}
    for row in samples:
        day=row['day']
        if before(day,boundaries[0]): group='train'
        elif boundaries[0] <= day and before(day,boundaries[1]): group='validation'
        elif boundaries[1] <= day and before(day,boundaries[2]): group='calibration'
        elif boundaries[2] <= day: group='test'
        else: continue
        groups[group].append(row)
    # Even unusually long delayed journeys cannot place labels after next split starts.
    for left,right in [('train','validation'),('validation','calibration'),('calibration','test')]:
        cutoff=min(r['asof'] for r in groups[right])
        groups[left]=[r for r in groups[left] if stamp(r['label_at']) < stamp(cutoff)]
    for name,rows in groups.items():
        if len({r['journey'] for r in rows}) < (50 if name=='train' else 20):
            raise ValueError('Insufficient independent journeys in '+name)
    return groups


def metrics(actual,predicted):
    import numpy as np
    error=np.asarray(actual)-np.asarray(predicted)
    return {'mae_minutes':float(np.mean(np.abs(error))), 'rmse_minutes':float(np.sqrt(np.mean(error**2))),
            'p90_absolute_error_minutes':float(np.quantile(np.abs(error),.9)), 'samples':len(error)}


def export_model(model,vectorizer):
    trees=[]
    for estimator in model.estimators_[:,0]:
        tree=estimator.tree_
        trees.append({'left':tree.children_left.tolist(),'right':tree.children_right.tolist(),
                      'feature':tree.feature.tolist(),'threshold':tree.threshold.tolist(),
                      'value':tree.value[:,0,0].tolist()})
    return {'feature_names':vectorizer.get_feature_names_out().tolist(),
            'intercept':float(model.init_.constant_[0,0]),'learning_rate':float(model.learning_rate),'trees':trees}


def run(input_path,output_dir,since):
    import numpy as np
    import sklearn
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.feature_extraction import DictVectorizer
    samples,rejected=build_samples(input_path,since)
    groups=temporal_split(samples)
    vectorizer=DictVectorizer(dtype=np.float32)
    x={}; residual={}; baseline={}; y={}
    x['train']=vectorizer.fit_transform([r['features'] for r in groups['train']])
    for name,rows in groups.items():
        if name!='train': x[name]=vectorizer.transform([r['features'] for r in rows])
        y[name]=np.array([r['target'] for r in rows])
        baseline[name]=np.array([r['features']['current_delay'] for r in rows])
        residual[name]=y[name]-baseline[name]
    print(json.dumps({'samples':len(samples),'partitions':{k:len(v) for k,v in groups.items()},'features':x['train'].shape[1]}),flush=True)
    candidates=[]; best=None; best_mae=float('inf')
    for depth,trees in [(2,80),(3,120),(3,200)]:
        start=time.monotonic()
        model=GradientBoostingRegressor(loss='huber',n_estimators=trees,max_depth=depth,
                    learning_rate=.05,min_samples_leaf=30,random_state=26028)
        # Each journey has equal total weight regardless of its route length.
        count=Counter(r['journey'] for r in groups['train'])
        weight=np.array([1/count[r['journey']] for r in groups['train']]); weight*=len(weight)/weight.sum()
        model.fit(x['train'],residual['train'],sample_weight=weight)
        result=metrics(y['validation'],baseline['validation']+model.predict(x['validation']))
        candidates.append({'max_depth':depth,'n_estimators':trees,'validation':result,'seconds':time.monotonic()-start})
        print(json.dumps(candidates[-1]),flush=True)
        if result['mae_minutes']<best_mae: best, best_mae=model,result['mae_minutes']
    predictions={name:baseline[name]+best.predict(x[name]) for name in groups}
    evaluation={name:{'model':metrics(y[name],predictions[name]),'delay_adjusted':metrics(y[name],baseline[name]),
                      'schedule':metrics(y[name],np.zeros(len(y[name]))),
                      'journeys':len({r['journey'] for r in rows}), 'date_start':min(r['day'] for r in rows),
                      'date_end':max(r['day'] for r in rows)} for name,rows in groups.items()}
    # A calibration period independent of model fitting/selection supplies an empirical range.
    calibration_error=np.abs(y['calibration']-predictions['calibration'])
    radius=float(np.quantile(calibration_error,min(1,np.ceil((len(calibration_error)+1)*.9)/len(calibration_error)),method='higher'))
    evaluation['test']['interval_coverage']=float(np.mean(np.abs(y['test']-predictions['test'])<=radius))
    horizons={}; validation_horizons={}
    for partition,destination in [('validation',validation_horizons),('test',horizons)]:
        for low,high,name in [(0,60,'under_1h'),(60,180,'1_to_3h'),(180,360,'3_to_6h'),(360,1440,'6_to_24h')]:
            indexes=[i for i,r in enumerate(groups[partition]) if low < r['features']['scheduled_horizon_minutes'] <= high]
            if indexes: destination[name]={'model':metrics(y[partition][indexes],predictions[partition][indexes]),'delay_adjusted':metrics(y[partition][indexes],baseline[partition][indexes])}
    # Bootstrap independent journeys, not correlated station rows.
    journey_improvements=defaultdict(list)
    for row,truth,pred,base in zip(groups['test'],y['test'],predictions['test'],baseline['test']):
        journey_improvements[row['journey']].append(abs(truth-base)-abs(truth-pred))
    improvements=np.array([np.mean(v) for v in journey_improvements.values()])
    rng=np.random.default_rng(26028)
    bootstrap=np.mean(rng.choice(improvements,size=(1000,len(improvements)),replace=True),axis=1)
    ci=np.quantile(bootstrap,[.025,.975]).tolist()
    passed=(evaluation['validation']['model']['mae_minutes'] < .95*evaluation['validation']['delay_adjusted']['mae_minutes']
        and evaluation['test']['model']['mae_minutes'] < .95*evaluation['test']['delay_adjusted']['mae_minutes']
        and evaluation['test']['model']['rmse_minutes'] <= 1.02*evaluation['test']['delay_adjusted']['rmse_minutes']
        and ci[0]>0)
    numeric=[k for k,v in groups['train'][0]['features'].items() if isinstance(v,(int,float))]
    ranges={k:[float(min(r['features'][k] for r in groups['train'])),float(max(r['features'][k] for r in groups['train']))] for k in numeric}
    # Scope is selected using validation only. Never tune serving scope on test errors.
    allowed_horizons=[name for name,m in validation_horizons.items() if m['model']['mae_minutes'] < m['delay_adjusted']['mae_minutes']]
    pair_counts=Counter((r['train'],r['features']['current_station'],r['features']['target_station']) for r in groups['train'])
    portable=export_model(best,vectorizer)
    parity=max(abs(evaluate_trees(portable,row['features'])-float(pred)) for row,pred in
               zip(groups['test'][:1000],best.predict(x['test'][:1000])))
    if parity > 1e-5: raise ValueError('Portable inference differs from training runtime: '+str(parity))
    artifact={'schema_version':1,'feature_version':FEATURE_VERSION,'name':'eta-gbr-landmark-v1','trained_at':datetime.now(timezone.utc).isoformat(),
      'status':'awaiting_policy_audit' if passed else 'not_qualified','training_cutoff':max(r['label_at'] for r in groups['train']),
      'source':'third-party-reported-WIMT-history','source_sha256':hashlib.sha256(Path(input_path).read_bytes()).hexdigest(),
      'source_url':'https://huggingface.co/datasets/yadavsaurabh/indian-railways-runs',
      'source_revision':'d131017ee61b65681a1908025b93813169e8fb8f','declared_source_license':'GPL-3.0',
      'library_versions':{'scikit_learn':sklearn.__version__,'numpy':np.__version__},
      'model_evaluation_passed':bool(passed),'promotion_passed':False,'serving_policy_passed':False,
      'validation':{'mae_minutes':evaluation['test']['model']['mae_minutes'],
        'baseline_mae_minutes':evaluation['test']['delay_adjusted']['mae_minutes'],'rmse_minutes':evaluation['test']['model']['rmse_minutes'],
        'test_journeys':evaluation['test']['journeys']},
      'scope':{'trains':sorted({r['train'] for r in groups['train']}),
        'stations':sorted({r['features']['target_station'] for r in groups['train']} | {r['features']['current_station'] for r in groups['train']}),
        'ranges':ranges,'allowed_horizons':allowed_horizons,'max_landmark_age_minutes':15,
        'pairs':[list(pair) for pair,count in sorted(pair_counts.items()) if count >= 20],
        'evaluation_end':max(r['label_at'] for r in groups['test']),'max_evaluation_age_days':180},
      'interval':{'target_coverage':.9,'radius_minutes':radius,'method':'held-out calibration absolute residual'},
      'model':portable}
    report={'dataset':{'samples':len(samples),'journeys':len({r['journey'] for r in samples}),'since':since,'rejections':rejected},
      'split_method':'complete journey dates, chronological train/validation/calibration/test, 3-day embargo and label-time purge',
      'evaluation':evaluation,'horizon_metrics':horizons,'validation_horizon_metrics':validation_horizons,
      'portable_max_absolute_difference':parity,'candidates':candidates,'promotion_passed':bool(passed),
      'journey_mae_improvement_95pct_ci':ci,'interval_radius_minutes':radius,
      'limitations':['3-train pilot, not network-wide accuracy','Third-party reported station times, not railway-certified ground truth',
        'Retrospective station-landmark replay, not prospective RailRadar validation','No historical weather, GPS, speed, congestion, signal or track-clearance inputs',
        'Source routes/timetables and provider reporting practices may differ from current RailRadar']}
    output=Path(output_dir); output.mkdir(parents=True,exist_ok=True)
    (output/'model.json').write_text(json.dumps(artifact,allow_nan=False,separators=(',',':')),encoding='utf-8')
    (output/'evaluation.json').write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf-8')
    # Dataset lineage/split manifest has no individual raw station records.
    (output/'split_manifest.json').write_text(json.dumps({k:sorted({r['journey'] for r in v}) for k,v in groups.items()},indent=2),encoding='utf-8')
    print(json.dumps({'promotion_passed':passed,'test':evaluation['test'],'ci':ci,'artifact':str(output/'model.json')}),flush=True)
    return artifact,report

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--input',default=str(ROOT/'data/processed/eta_stop_events.jsonl'))
    parser.add_argument('--output',default=str(ROOT/'backend/data/eta_ml')); parser.add_argument('--since',default='2025-01-01')
    args=parser.parse_args(); run(args.input,args.output,args.since)
