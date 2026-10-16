'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrainFront, ArrowRight, Clock3 } from 'lucide-react';
import { UnifiedSearch, type SearchResult } from './UnifiedSearch';
import { CompactTrainCard } from './CompactTrainCard';
import { QuickActions } from './QuickActions';
import { RecentSearches, saveRecentSearch } from './RecentSearches';
import { LiveSnapshot } from './LiveSnapshot';
import styles from './PassengerDashboard.module.css';

export function PassengerDashboard() {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);
  const result = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selectedTrain || !result.current) return;
    result.current.focus({ preventScroll: true });
    const main = result.current.closest('main');
    if (main) main.scrollTo({ top: main.scrollTop + result.current.getBoundingClientRect().top - main.getBoundingClientRect().top - 20, behavior: 'instant' });
  }, [selectedTrain]);

  function select(result: SearchResult) {
    saveRecentSearch(result);
    if (result.type === 'train') setSelectedTrain(result.id);
    else router.push(`/stations?station=${encodeURIComponent(result.id)}`);
  }
  function closeResult() {
    setSelectedTrain(null);
    root.current?.querySelector<HTMLInputElement>('[role="combobox"]')?.focus();
  }

  return <div ref={root} className={styles.dashboard}>
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>Your railway companion</p>
        <h1>Your journey, in view.</h1>
        <p className={styles.pageIntro}>Less guessing. More knowing when you’ll arrive.</p>
      </div>
      <span className={styles.headerNote}><Clock3 size={15} /> All train times in IST</span>
    </header>

    <div className={styles.overview}>
      <section className={styles.searchPanel} aria-labelledby="find-train-title">
        <div className={styles.searchHeading}>
          <span className={styles.featureIcon}><TrainFront size={23} strokeWidth={1.7} /></span>
          <span className={styles.smallLabel}>Start with your train</span>
        </div>
        <h2 id="find-train-title">Where’s your train?</h2>
        <p className={styles.searchIntro}>Find its latest position, arrival time and the stops along the way.</p>
        <UnifiedSearch onSelect={select} />
        <div className={styles.searchFoot}>
          <span>A 5-digit train number is the quickest way to search.</span>
          <span className={styles.searchHint}>Search <ArrowRight size={12} /> Choose a stop <ArrowRight size={12} /> See your ETA</span>
        </div>
      </section>
      <LiveSnapshot />
    </div>

    {selectedTrain && <section ref={result} tabIndex={-1} aria-label="Selected train" className={styles.selectedTrain}>
      <CompactTrainCard number={selectedTrain} onClose={closeResult} />
    </section>}

    <section aria-labelledby="explore-title" className={styles.explore}>
      <div className={styles.sectionHeading}><h2 id="explore-title">A little more clarity</h2><span>Useful tools for the journey ahead</span></div>
      <QuickActions />
    </section>
    <RecentSearches onSelect={select} />
  </div>;
}
