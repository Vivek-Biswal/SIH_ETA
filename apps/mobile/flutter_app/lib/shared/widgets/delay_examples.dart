import 'package:flutter/material.dart';

const _examples = <(String, String)>[
  (
    "🚦 Signal problem",
    "A signal failure can hold a train until the section is cleared for safe movement.",
  ),
  (
    "🚆 Previous train late",
    "The same coaches may arrive late from their previous journey, delaying the next departure.",
  ),
  (
    "🚦 Traffic / congestion",
    "A train may wait while another service passes through a shared section.",
  ),
  (
    "🛤️ Track maintenance",
    "Maintenance can require trains to run at a lower speed on part of the route.",
  ),
  (
    "🚉 Platform unavailable",
    "A train may wait outside a station until a suitable platform becomes free.",
  ),
  (
    "🚂 Locomotive issue",
    "An equipment inspection or repair can add an unscheduled stop.",
  ),
  (
    "🌧️ Weather",
    "Heavy rain, poor visibility or other adverse conditions can affect safe operating speeds.",
  ),
  (
    "👥 Alarm chain",
    "An emergency alarm activation can bring a train to an unscheduled stop.",
  ),
  (
    "🐄 Track obstruction",
    "An obstruction on the track can require a train to stop until the line is safe.",
  ),
  (
    "🏗️ Engineering work",
    "Engineering work can restrict track capacity or require a temporary speed restriction.",
  ),
];

class DelayExamples extends StatelessWidget {
  const DelayExamples({super.key});
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Divider(height: 32),
      const Text(
        'Learn about common delay causes',
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: 8),
      const Text(
        'Static educational examples. These are possible situations, not reported events for this train. They do not change your ETA.',
        style: TextStyle(fontSize: 13, height: 1.5),
      ),
      const SizedBox(height: 12),
      for (final example in _examples)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Card(
            margin: EdgeInsets.zero,
            child: ExpansionTile(
              title: Text(
                example.$1,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              children: [Text(example.$2, style: const TextStyle(height: 1.5))],
            ),
          ),
        ),
    ],
  );
}
