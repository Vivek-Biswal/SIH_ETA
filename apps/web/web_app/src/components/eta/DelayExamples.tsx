const examples = [
  ['🚦 Signal problem', 'A signal failure can hold a train until the section is cleared for safe movement.'],
  ['🚆 Previous train late', 'The same coaches may arrive late from their previous journey, delaying the next departure.'],
  ['🚦 Traffic / congestion', 'A train may wait while another service passes through a shared section.'],
  ['🛤️ Track maintenance', 'Maintenance can require trains to run at a lower speed on part of the route.'],
  ['🚉 Platform unavailable', 'A train may wait outside a station until a suitable platform becomes free.'],
  ['🚂 Locomotive issue', 'An equipment inspection or repair can add an unscheduled stop.'],
  ['🌧️ Weather', 'Heavy rain, poor visibility or other adverse conditions can affect safe operating speeds.'],
  ['👥 Alarm chain', 'An emergency alarm activation can bring a train to an unscheduled stop.'],
  ['🐄 Track obstruction', 'An obstruction on the track can require a train to stop until the line is safe.'],
  ['🏗️ Engineering work', 'Engineering work can restrict track capacity or require a temporary speed restriction.'],
];

export function DelayExamples() {
  return <details className="mt-4 border-t border-border pt-4">
    <summary className="cursor-pointer font-medium text-foreground">Learn about common delay causes</summary>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Static educational examples. These are possible situations, not reported events for this train. They do not change your ETA.</p>
    <div className="mt-3 space-y-2">
      {examples.map(([title, description]) => <details key={title} className="rounded-xl border border-border bg-background p-4">
        <summary className="cursor-pointer font-medium text-foreground">{title}</summary>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </details>)}
    </div>
  </details>;
}

