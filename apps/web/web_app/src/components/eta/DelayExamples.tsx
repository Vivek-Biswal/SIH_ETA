export function DelayExamples({ delayMinutes }: { delayMinutes?: number | null }) {
  let title = "⏱️ On time";
  let description = "The train is currently running on schedule. Operations are proceeding normally.";

  if (typeof delayMinutes === 'number') {
    if (delayMinutes > 0) {
      title = "🚦 Traffic / congestion";
      description = "Delayed due to congestion on the route. The train was held to allow another service to pass.";
    } else if (delayMinutes < 0) {
      title = "🚀 Ahead of schedule";
      description = "The train is running ahead of schedule due to clear routes and optimal running conditions.";
    }
  }

  return (
    <div className="mt-3" aria-label="ETA explanation">
      <div className="rounded-xl border border-border bg-background p-4">
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

