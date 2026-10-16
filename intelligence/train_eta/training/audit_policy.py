"""Evaluate the exported model *with serving coverage gates*, without refitting.

This is a fixed audit of the same held-out period, not another tuning round.
"""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys

from train import ROOT, build_samples, temporal_split, metrics
from eta_features import evaluate_trees


def audit(input_path, output):
    from datetime import datetime
    import numpy as np
    output=Path(output)
    artifact=json.loads((output/'model.json').read_text(encoding='utf-8'))
    report=json.loads((output/'evaluation.json').read_text(encoding='utf-8'))
    groups=temporal_split(build_samples(input_path,report['dataset']['since'])[0])
    scope=artifact['scope']; pairs={tuple(p) for p in scope['pairs']}
    def bucket(value):
        for high,name in [(60,'under_1h'),(180,'1_to_3h'),(360,'3_to_6h'),(1440,'6_to_24h')]:
            if value<=high:return name
    result={}
    for partition in ('validation','test'):
        actual=[];predicted=[];baseline=[];covered=[];bytrain=defaultdict(list)
        for row in groups[partition]:
            f=row['features'];base=f['current_delay']
            supported=((row['train'],f['current_station'],f['target_station']) in pairs
                       and bucket(f['scheduled_horizon_minutes']) in scope['allowed_horizons']
                       and all(low <= f[key] <= high for key,(low,high) in scope['ranges'].items()))
            prediction=base+evaluate_trees(artifact['model'],f) if supported else base
            supported=supported and -120<=prediction<=1440
            prediction=prediction if supported else base
            index=len(actual); actual.append(row['target']);predicted.append(prediction);baseline.append(base)
            covered.append(supported);bytrain[row['train']].append(index)
        actual=np.array(actual);predicted=np.array(predicted);baseline=np.array(baseline);covered=np.array(covered)
        result[partition]={'model_with_fallback':metrics(actual,predicted),'delay_adjusted':metrics(actual,baseline),
                           'ml_covered_samples':int(covered.sum()),'coverage_fraction':float(covered.mean()),
                           'by_train':{train:{'model_with_fallback':metrics(actual[ix],predicted[ix]),
                                              'delay_adjusted':metrics(actual[ix],baseline[ix])} for train,ix in bytrain.items()}}
    # Deployment still requires the original model's predeclared promotion gate.
    # A failed policy gate disables deployment, rather than changing test scope.
    gate=all(result[p]['model_with_fallback']['mae_minutes'] < .95*result[p]['delay_adjusted']['mae_minutes']
             and result[p]['model_with_fallback']['rmse_minutes'] <= 1.02*result[p]['delay_adjusted']['rmse_minutes'] for p in result)
    model_passed=artifact.get('model_evaluation_passed',artifact['promotion_passed'])
    artifact['model_evaluation_passed']=model_passed
    artifact['serving_policy_passed']=bool(gate)
    artifact['promotion_passed']=model_passed and gate
    artifact['status']='validated_pilot' if artifact['promotion_passed'] else 'not_qualified'
    artifact['validation'].update({k:result['test']['model_with_fallback'][k] for k in ('mae_minutes','rmse_minutes')})
    artifact['validation']['baseline_mae_minutes']=result['test']['delay_adjusted']['mae_minutes']
    report['serving_policy_evaluation']=result
    report['serving_policy_passed']=bool(gate)
    report['promotion_passed']=artifact['promotion_passed']
    report['serving_policy_limitations']=['Station-landmark replay only; not continuous GPS or prospective RailRadar accuracy.',
                                         'Route-order clamping and current-location agreement are not replayed because the historical source lacks equivalent snapshots.']
    (output/'model.json').write_text(json.dumps(artifact,allow_nan=False,separators=(',',':')),encoding='utf-8')
    (output/'evaluation.json').write_text(json.dumps(report,allow_nan=False,indent=2),encoding='utf-8')
    print(json.dumps({'promotion_passed':artifact['promotion_passed'],'policy':result}),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--input',default=str(ROOT/'data/processed/eta_stop_events.jsonl'))
    parser.add_argument('--output',default=str(ROOT/'backend/data/eta_ml'))
    args=parser.parse_args();audit(args.input,args.output)
