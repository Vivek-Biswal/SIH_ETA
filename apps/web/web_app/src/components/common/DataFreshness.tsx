import React, { useState, useEffect } from 'react';

interface DataFreshnessProps {
  lastUpdated?: Date;
  status?: 'live' | 'stale' | 'unavailable';
}

export const DataFreshness: React.FC<DataFreshnessProps> = ({ 
  lastUpdated = new Date(),
  status = 'live' 
}) => {
  const [timeAgo, setTimeAgo] = useState('just now');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
      
      if (diffInSeconds < 60) {
        setTimeAgo('just now');
      } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${mins} min${mins === 1 ? '' : 's'} ago`);
      } else {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours} hour${hours === 1 ? '' : 's'} ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (status === 'unavailable') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        Data Unavailable
      </div>
    );
  }

  if (status === 'stale') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
        <div className="w-1.5 h-1.5 rounded-full bg-warning" />
        Data may be outdated
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      Live • Updated {timeAgo}
    </div>
  );
};
