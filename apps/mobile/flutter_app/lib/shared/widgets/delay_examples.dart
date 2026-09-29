import 'package:flutter/material.dart';

const _examples = <(String, String)>[
  ("🚦 Signal problem", "Delayed due to a signal failure near Jaipur. The train was held for approximately 18 minutes before proceeding."),
  ("🚆 Previous train late", "Delayed because the incoming rake arrived 32 minutes late from the previous journey. This delay carried forward to the current trip."),
  ("🚦 Traffic / congestion", "Delayed due to congestion on the route. The train was held to allow another service to pass."),
  ("🛤️ Track maintenance", "Delayed due to scheduled track maintenance near Jodhpur, requiring a temporary speed restriction."),
  ("🚉 Platform unavailable", "Delayed because the assigned platform was occupied by another train. The train was held before entering the station."),
  ("🚂 Locomotive issue", "Delayed due to a locomotive/equipment issue. The train was held for inspection before continuing."),
  ("🌧️ Weather", "Delayed due to adverse weather conditions affecting train operations on this section."),
  ("👥 Alarm chain", "Delayed because the emergency alarm chain was activated, causing an unscheduled stop."),
  ("🐄 Track obstruction", "Delayed because the train was stopped due to an obstruction detected on the track."),
  ("🏗️ Engineering work", "Delayed due to engineering work on the route and the resulting temporary speed restriction."),
];

class DelayExamples extends StatelessWidget {
  const DelayExamples({super.key});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Divider(height: 32),
    const Text('Common reasons for a delay', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
    const SizedBox(height: 8),
    const Text('Static examples only. Places, times and causes below are illustrative, not verified events for this train. They do not change your ETA.', style: TextStyle(fontSize: 13, height: 1.5)),
    const SizedBox(height: 12),
    for (final example in _examples) Padding(padding: const EdgeInsets.only(bottom: 8), child: Card(margin: EdgeInsets.zero, child: ExpansionTile(title: Text(example.$1, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)), childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16), expandedCrossAxisAlignment: CrossAxisAlignment.start, children: [Text(example.$2, style: const TextStyle(height: 1.5))]))),
  ]);
}

