'use client';

import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface TopWarningsProps {
  warnings: any[];
  isLoading: boolean;
}

export const TopWarnings: React.FC<TopWarningsProps> = ({ warnings, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors h-full flex flex-col">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-foreground">Top Propagation Warnings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">High-risk train interactions</p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[400px]">
        {warnings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No warnings found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Train</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Station</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Risk Score</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {warnings.map((warn, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{warn.source_train} → {warn.target_train}</div>
                    <div className="text-[10px] text-muted-foreground">Delay: {warn.source_arr_delay}m</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {warn.station}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-foreground">{Math.round(warn.risk_score * 100)}%</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      warn.warning_priority === 'CRITICAL' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                    }`}>
                      {warn.warning_priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
