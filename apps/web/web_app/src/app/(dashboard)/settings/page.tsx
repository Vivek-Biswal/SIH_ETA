'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ArrowUpRight, Check, Clock3, History, Laptop, Moon, Palette, Settings2, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { refreshDescription, saveLiveRefresh, useLiveRefresh, type RefreshInterval } from '@/services/preferences';
import styles from './settings.module.css';

const themes = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
];
const intervals: { value: RefreshInterval; label: string; description: string }[] = [
  { value: 120000, label: 'Every 2 minutes', description: 'Recommended' },
  { value: 300000, label: 'Every 5 minutes', description: 'Fewer requests' },
  { value: 0, label: 'Manual only', description: 'You choose when' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const interval = useLiveRefresh();
  const [ready, setReady] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setReady(true);
    const read = () => {
      try { const value: unknown = JSON.parse(localStorage.getItem('sih_recent_searches') || '[]'); setHasHistory(Array.isArray(value) && value.length > 0); }
      catch { setHasHistory(false); }
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  function clearHistory() {
    try {
      localStorage.removeItem('sih_recent_searches');
      window.dispatchEvent(new Event('etaernal-search-history-changed'));
      setHasHistory(false); setConfirmClear(false); setNotice('Recent searches cleared from this browser.');
    } catch { setNotice('Browser storage is unavailable. Recent searches could not be cleared.'); }
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <span className={styles.headerIcon}><Settings2 size={24} aria-hidden="true" /></span>
      <div><p className={styles.eyebrow}>MAKE IT YOURS</p><h1>Settings</h1><p className={styles.subtitle}>A little more comfort for every journey.</p></div>
      <span className={styles.browserNote}><ShieldCheck size={15} aria-hidden="true" /> Saved on this browser</span>
    </header>
    <div className={styles.layout}>
      <div className={styles.main}>
        <section className={styles.card} aria-labelledby="appearance-heading">
          <div className={styles.sectionHeading}><Palette size={20} aria-hidden="true" /><div><h2 id="appearance-heading">Appearance</h2><p>Choose what feels easiest on your eyes.</p></div></div>
          <div className={styles.themeOptions} role="group" aria-label="Color theme">
            {themes.map(({ value, label, Icon }) => <button key={value} type="button" disabled={!ready} aria-pressed={ready && theme === value} className={styles.themeOption} onClick={() => { setTheme(value); setNotice(`${label} appearance selected.`); }}>
              <span className={`${styles.preview} ${styles[value]}`} aria-hidden="true"><span /><span><i /><i /><i /></span></span>
              <span className={styles.optionLabel}><Icon size={16} aria-hidden="true" />{label}<span className={styles.selected}><Check size={14} aria-hidden="true" /></span></span>
            </button>)}
          </div>
          <p className={styles.footnote}>System follows your device’s light or dark appearance.</p>
        </section>
        <section className={styles.card} aria-labelledby="updates-heading">
          <div className={styles.sectionHeading}><Clock3 size={20} aria-hidden="true" /><div><h2 id="updates-heading">Train updates</h2><p>Find your balance between freshness and data usage.</p></div></div>
          <fieldset className={styles.frequency}><legend>Check for new running information</legend>
            {intervals.map(option => <label key={option.value} className={styles.frequencyOption}>
              <input type="radio" name="refresh-interval" value={option.value} disabled={!ready} checked={interval === option.value} onChange={() => setNotice(saveLiveRefresh(option.value) ? 'Train update preference saved.' : 'Browser storage is unavailable. This preference could not be saved.')} />
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>)}
          </fieldset>
          <div className={styles.info}><Clock3 size={17} aria-hidden="true" /><p>{refreshDescription(interval)} A train loads when you select it, and Refresh remains available.</p></div>
          <p className={styles.footnote}>Applies to train tracking and ETA pages. Pages pause automatic checks while hidden. Provider updates may arrive less often; the last reported time is always shown.</p>
        </section>
        <section className={styles.card} aria-labelledby="history-heading">
          <div className={styles.historyRow}><div className={styles.sectionHeading}><History size={20} aria-hidden="true" /><div><h2 id="history-heading">Recent searches</h2><p>{hasHistory ? 'Clear the train and station shortcuts saved here.' : 'There are no recent searches on this browser.'}</p></div></div>
            <button type="button" className={styles.secondary} disabled={!hasHistory} onClick={() => setConfirmClear(true)}><Trash2 size={15} aria-hidden="true" />Clear history</button>
          </div>
          {confirmClear && <div className={styles.confirm}><p>Clear recent searches? Your appearance and update preferences will stay as they are.</p><div><button type="button" className={styles.secondary} onClick={() => setConfirmClear(false)}>Keep searches</button><button type="button" className={styles.danger} onClick={clearHistory}>Clear searches</button></div></div>}
        </section>
      </div>
      <aside className={styles.aside}>
        <section className={`${styles.card} ${styles.about}`}><span className={styles.aboutIcon}><ShieldCheck size={23} aria-hidden="true" /></span><h2>Your preferences.<br />Your device.</h2><p>These choices are saved in this browser. They don’t change railway operations or anyone else’s settings.</p><div className={styles.fact}><span>Arrival times</span><strong>Indian Standard Time</strong><small>IST · UTC +05:30</small></div><div className={styles.fact}><span>Running information</span><strong>Latest available report</strong><small>An estimate can change as new updates arrive.</small></div></section>
        <Link className={styles.helpLink} href="/network"><div><strong>Make sense of your journey</strong><span>Track a train or explore delay patterns.</span></div><ArrowUpRight size={19} aria-hidden="true" /></Link>
      </aside>
    </div>
    <p role="status" aria-live="polite" className={styles.notice}>{notice || 'Preferences save automatically. No account required.'}</p>
  </div>;
}
