'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, RefreshCw, Plus, X, ArrowUpRight, Clock3, Check, Info } from 'lucide-react';
import { useJourneyAlerts } from '@/hooks/useJourneyAlerts';
import { buildAlerts, journeyLink, watchView, WATCH_LIMIT } from '@/services/journeyAlerts';
import { predictionKey } from '@/services/etaReason';
import { time } from '@/services/passenger';
import styles from './JourneyAlerts.module.css';

export function JourneyAlerts() {
  const model = useJourneyAlerts();
  const [number, setNumber] = useState(''), [date, setDate] = useState('');
  const [threshold, setThreshold] = useState(15), [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all'), [trainFilter, setTrainFilter] = useState('all');
  const alerts = model.watches.flatMap(w => buildAlerts(w, model.checks[w.id], model.now))
    .sort((a, b) => Number(b.severity === 'attention') - Number(a.severity === 'attention') || Date.parse(b.observed) - Date.parse(a.observed));
  const unread = alerts.filter(a => !model.read.includes(a.id));
  const reliable = model.watches.filter(w => watchView(w, model.checks[w.id], model.now).reliable).length;
  const activeTrainFilter = model.watches.some(w => w.id === trainFilter) ? trainFilter : 'all';
  const visible = alerts.filter(a => (activeTrainFilter === 'all' || a.watchId === activeTrainFilter)
    && (filter === 'all' || filter === 'attention' && a.severity === 'attention' || filter === 'unread' && !model.read.includes(a.id)));
  const canRefresh = model.watches.some(w => model.canRefresh(w.id));

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = model.add(number.trim(), date, threshold);
    setMessage(error || 'Journey added. Its latest check appears below.');
    if (!error) { setNumber(''); setDate(''); }
  }

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroIcon}><Bell size={24} /></div>
      <div><p className={styles.eyebrow}>Etaernal / Journey alerts</p><h1>Updates that matter to your journey.</h1><p>Watch your train for delays, changed arrival estimates and reported service issues.</p></div>
    </header>

    <div className={styles.explainer}><Info size={18} /><p>Updates appear here when you check your trains. No phone notifications are sent when this page is closed. For older delay patterns, see <Link href="/network" prefetch={false}>Past Delay Insights</Link>.</p></div>

    {!model.ready ? <p role="status" className={styles.panel}>Loading your saved alert settings…</p> : <>
      {model.storageWarning && <p role="alert" className={styles.warning}>{model.storageWarning}</p>}
      <section className={styles.panel} aria-labelledby="watch-heading">
        <div className={styles.sectionHeader}><div><h2 id="watch-heading">Choose the journeys you care about</h2><p>Up to {WATCH_LIMIT} journeys, saved on this browser. Adding a train checks it once.</p></div><span className={styles.badge}>{model.watches.length} / {WATCH_LIMIT} watched</span></div>
        <form onSubmit={add} className={styles.addForm}>
          <label>Train number<input required aria-label="Train number to watch" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 12423" /></label>
          <label>Train start date · optional<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>Warn when delayed by<select value={threshold} onChange={e => setThreshold(Number(e.target.value))}>{[5,15,30,60].map(n => <option key={n} value={n}>{n} minutes or more</option>)}</select></label>
          <button type="submit" className={styles.primary} disabled={model.watches.length >= WATCH_LIMIT}><Plus size={16} />Watch journey</button>
        </form>
        <p className={styles.hint}>Choose the date the train leaves its first station, or leave it blank to find its latest journey. Once found, that date stays fixed so overnight trains do not switch trips.</p>
        {message && <p role="status" className={styles.formMessage}>{message}</p>}
      </section>

      <div className={styles.workspace} data-has-watches={model.watches.length > 0}>
      {model.watches.length > 0 && <aside className={styles.watchColumn} aria-label="Watched journeys and check settings">
        <h2>Watched journeys</h2>
        <div className={styles.toolbar}>
          <label className={styles.checkbox}><input type="checkbox" checked={model.automatic && model.interval !== 0} disabled={model.interval === 0} onChange={e => model.setAutomatic(e.target.checked)} />Auto-check while this page is open</label>
          <p>{model.interval === 0 ? 'Automatic checks are disabled in Settings.' : model.automatic ? `Checks at most every ${model.interval / 60000} minutes while visible.` : 'Manual checks are on. No checks run just because you reopen this page.'} Checks pause after failures and never overlap. Manual mode uses fewer requests.</p>
        </div>
        <div className={styles.watches}>{model.watches.map(watch => {
          const check = model.checks[watch.id], view = watchView(watch, check, model.now);
          const busy = model.busy.includes(watch.id);
          return <section key={watch.id} className={styles.watch} aria-label={`Watched train ${watch.number}`} aria-busy={busy}>
            <div className={styles.watchHeader}><strong>{watch.number}</strong><button onClick={() => model.remove(watch.id)} aria-label={`Remove watched train ${watch.number}`} className={styles.iconButton}><X size={16} /></button></div>
            <h3>{view.status?.train_name || 'Your watched journey'}</h3>
            <p className={styles.hint}>Journey: {watch.date || 'Will be resolved on check'}</p>
            <span className={`${styles.badge} ${view.reliable ? styles.recent : ''}`}>{busy ? 'Checking report…' : check?.error ? 'Check unsuccessful' : view.reliable ? 'Recent train report' : check ? 'Older or unverified report' : 'Not checked this session'}</span>
            <label>Arrival stop<select value={watch.station} onChange={e => model.update(watch.id, { station: e.target.value })}>
              <option value="">Next available route stop</option>
              {view.predictions.map((p, i) => <option key={`${predictionKey(p)}:${i}`} value={predictionKey(p)}>{p.station?.name} · {p.station?.code}{Number.isInteger(p.route_sequence) ? ` · stop ${p.route_sequence! + 1}` : ''}</option>)}
              {watch.station && !view.predictions.some(p => predictionKey(p) === watch.station) && <option value={watch.station}>Selected stop · awaiting route</option>}
            </select></label>
            <label>Delay threshold<select value={watch.threshold} onChange={e => model.update(watch.id, { threshold: Number(e.target.value) })}>{[5,15,30,60].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>
            <div className={styles.timing}>
              {view.prediction && <p>{view.arrival.title}{view.arrival.predictedArrival ? <strong>{time(view.arrival.predictedArrival)}</strong> : null}</p>}
              <p>Train observation: {time(view.status?.last_known_location?.updated_at)}</p>
              <p>Last check: {check ? time(new Date(check.checkedAt).toISOString()) : 'Not checked'}</p>
            </div>
            {check?.error && <p role="status" className={styles.warning}>{check.error} Previous information, if shown, is not a new update.</p>}
            {check?.journey?.etaError && !check.error && <p className={styles.warning}>Arrival estimate could not be checked. Reported running delay may still be available.</p>}
            {check && !view.reliable && !check.error && <p className={styles.hint}>A newer verified train report is needed before generating current alerts.</p>}
            <div className={styles.watchActions}><button className={styles.secondary} disabled={!model.canRefresh(watch.id)} onClick={() => void model.refresh(watch)}><RefreshCw size={14} />{busy ? 'Checking…' : model.canRefresh(watch.id) ? 'Check now' : 'Waiting to check again'}</button><Link prefetch={false} href={journeyLink(watch.number, watch.date, view.prediction ? predictionKey(view.prediction) : watch.station)}>View journey <ArrowUpRight size={14} /></Link></div>
            {!busy && model.nextAllowedAt(watch.id) > model.now && <p className={styles.hint}>Next check available after {time(new Date(model.nextAllowedAt(watch.id)).toISOString())}.</p>}
          </section>;
        })}</div>
      </aside>}

      <section className={styles.panel} aria-labelledby="updates-heading">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>Your latest checks</p><h2 id="updates-heading">Journey updates</h2><p>Updates for the journeys you choose, based on their latest available reports.</p></div>{model.watches.length ? <button className={styles.secondary} disabled={!canRefresh} onClick={model.refreshAll}><RefreshCw size={16} />{model.busy.length ? 'Checking…' : 'Check updates'}</button> : <BellRing size={23} />}</div>
        <dl className={styles.stats}><div><dt>Watched journeys</dt><dd>{model.watches.length}</dd></div><div><dt>Unread updates</dt><dd>{unread.length}</dd></div><div><dt>Needs attention</dt><dd>{alerts.filter(a => a.severity === 'attention').length}</dd></div><div><dt>Recent train reports</dt><dd>{model.watches.length ? `${reliable} / ${model.watches.length}` : '—'}</dd></div></dl>
        <div className={styles.filters}><label>Show<select aria-label="Show journey updates" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All updates</option><option value="attention">Needs attention</option><option value="unread">Unread only</option></select></label><label>Journey<select aria-label="Journey filter" value={activeTrainFilter} onChange={e => setTrainFilter(e.target.value)}><option value="all">All watched journeys</option>{model.watches.map(w => <option key={w.id} value={w.id}>{w.number} · {w.date || 'latest available'}</option>)}</select></label><button className={styles.secondary} disabled={!unread.length} onClick={() => model.markRead(unread.map(a => a.id))}><Check size={15} />Mark all as read</button></div>
        <div aria-live="polite" className={styles.feed}>
          {visible.length ? visible.map(alert => <article key={alert.id} className={`${styles.alert} ${alert.severity === 'attention' ? styles.attention : ''}`}>
            <div className={styles.alertTop}><span className={styles.badge}>{alert.severity === 'attention' ? 'Needs attention' : 'Journey information'}</span><span className={styles.hint}>{model.read.includes(alert.id) ? 'Read' : 'Unread'} · Train {alert.number}</span></div>
            <h3>{alert.title}</h3><p>{alert.message}</p>
            <p className={styles.hint}><Clock3 size={13} />Based on the report at {time(alert.observed)} · Journey {alert.date}</p>
            {alert.details.length > 0 && <details><summary>What this is based on</summary><ul>{alert.details.map((line, i) => <li key={i}>{line}</li>)}</ul></details>}
            <div className={styles.watchActions}><Link href={journeyLink(alert.number, alert.date, alert.station)}>See arrival details <ArrowUpRight size={14} /></Link>{!model.read.includes(alert.id) && <button className={styles.secondary} onClick={() => model.markRead([alert.id])} aria-label={`Mark as read: ${alert.title}`}><Check size={14} />Mark as read</button>}</div>
          </article>) : <div className={styles.empty}><Bell size={28} /><h3>{!model.watches.length ? 'Start with your train.' : filter !== 'all' || activeTrainFilter !== 'all' ? 'No updates match these filters.' : reliable < model.watches.length ? 'Waiting for reliable journey updates.' : 'No watched journey meets your alert rules.'}</h3><p>{!model.watches.length ? 'Add a train number above. You decide which journey and arrival stop to watch.' : 'Use Check updates when available. Missing or old reports do not mean the train or network is running normally.'}</p></div>}
        </div>
        <p className={styles.hint}>Marking an update as read does not resolve the delay. Arrival estimates can change; exact delay causes are only shown when supported by the railway data. Changing an arrival stop or threshold uses information already loaded.</p>
      </section>
      </div>
    </>}
  </div>;
}
