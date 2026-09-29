const examples = [
  [
    "🚦 Signal problem",
    "Delayed due to a signal failure near Jaipur. The train was held for approximately 18 minutes before proceeding."
  ],
  [
    "🚆 Previous train late",
    "Delayed because the incoming rake arrived 32 minutes late from the previous journey. This delay carried forward to the current trip."
  ],
  [
    "🚦 Traffic / congestion",
    "Delayed due to congestion on the route. The train was held to allow another service to pass."
  ],
  [
    "🛤️ Track maintenance",
    "Delayed due to scheduled track maintenance near Jodhpur, requiring a temporary speed restriction."
  ],
  [
    "🚉 Platform unavailable",
    "Delayed because the assigned platform was occupied by another train. The train was held before entering the station."
  ],
  [
    "🚂 Locomotive issue",
    "Delayed due to a locomotive/equipment issue. The train was held for inspection before continuing."
  ],
  [
    "🌧️ Weather",
    "Delayed due to adverse weather conditions affecting train operations on this section."
  ],
  [
    "👥 Alarm chain",
    "Delayed because the emergency alarm chain was activated, causing an unscheduled stop."
  ],
  [
    "🐄 Track obstruction",
    "Delayed because the train was stopped due to an obstruction detected on the track."
  ],
  [
    "🏗️ Engineering work",
    "Delayed due to engineering work on the route and the resulting temporary speed restriction."
  ]
];

export function DelayExamples() {
  return <div className="mt-2" aria-label="Illustrative delay explanations">
    <table className="w-full text-left text-sm border-collapse">
      <thead>
        <tr className="border-b border-border">
          <th className="py-3 px-2 font-medium text-foreground w-1/3">Situation</th>
          <th className="py-3 px-2 font-medium text-foreground w-2/3">What your app could say</th>
        </tr>
      </thead>
      <tbody>
        {examples.map(([title, description]) => (
          <tr key={title} className="border-b border-border/50 last:border-0 align-top">
            <td className="py-3 px-2 text-foreground font-medium">{title}</td>
            <td className="py-3 px-2 text-muted-foreground leading-relaxed">{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
}

