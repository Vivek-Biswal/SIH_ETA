# Design System: SIH ETA (Train Network Intelligence)

## 1. Visual Theme & Atmosphere
A highly legible, precision-engineered interface. The atmosphere is functional and data-dense but rigorously organized — like a modern air traffic control interface or a high-end financial terminal. 
- **Density**: 7/10 (Cockpit Dense). Information is compact but never overlapping.
- **Variance**: 4/10 (Predictable Symmetric). Grids are strict and predictable to aid quick scanning of real-time data.
- **Motion**: 3/10 (Static Restrained). Motion is used exclusively for state changes and live updates (pulse dots for live status, smooth number transitions).

## 2. Color Palette & Roles
The color system relies on stark neutrals for structure and highly calibrated semantic colors for status.

**Neutrals (Structure & Typography):**
- **Canvas Black** (`#09090B`) — Primary background surface (Dark mode defaults for high-contrast visibility).
- **Surface Zinc** (`#18181B`) — Card and container fill.
- **Whisper Border** (`rgba(255,255,255,0.1)`) — Structural lines, table dividers, card borders.
- **Pure White** (`#FFFFFF`) — Primary text, critical data points (ETA times, Train numbers).
- **Muted Steel** (`#A1A1AA`) — Secondary text, metadata, table headers, inactive states.

**Semantic Accents (Status & Alerts):**
- **Live Green** (`#22C55E`) — On-time status, live active indicators, successful operations.
- **Warning Amber** (`#F59E0B`) — Early warnings, minor delays (1-14 mins), moderate network congestion.
- **Critical Red** (`#EF4444`) — Severe delays (15+ mins), critical network conflicts, route blockages.
- **Brand Blue** (`#3B82F6`) — Interactive elements, primary CTAs, active tab states (Used sparingly).

*Note: Saturation is controlled. No neon glows or "AI purple". Color is always paired with an icon or text label for accessibility.*

## 3. Typography Rules
Typography must prioritize absolute legibility for numbers and data.

- **Display/Headlines:** `Geist` — Track-tight, controlled scale. Hierarchy is driven by weight (Medium/Semibold) and color (White vs Muted Steel), not massive size.
- **Body:** `Geist` — Relaxed leading. Used for descriptions, labels, and standard UI text.
- **Data/Numbers:** `Geist Mono` or `JetBrains Mono` — Mandatory for all ETAs, time predictions, train numbers, and delay minutes. Monospace ensures tabular data aligns perfectly and live-updating numbers don't cause layout shift.
- **Banned:** `Inter`, any serif fonts (`Times New Roman`, `Georgia`, etc.).

## 4. Component Stylings

*   **Status Badges:** Pill-shaped (`border-radius: 9999px`). High contrast. Background is 15% opacity of the semantic color; text is 100% of the semantic color. Contains a small preceding dot for live states.
*   **Cards (Train/Station details):** Sharp or slightly rounded corners (`0.25rem` or `0.5rem`). 1px solid border (`Whisper Border`). Flat background (`Surface Zinc`). No drop shadows (rely on borders for elevation).
*   **ETA Display (The Core Component):** Large, highly visible monospace typography for the predicted time. Side-by-side comparison of `Scheduled` (muted, strikethrough if delayed) vs `Predicted` (bold, semantic color if delayed).
*   **Timeline/Route Component:** A vertical track connecting station nodes. Past nodes are filled/muted; current node is pulsing/active; future nodes are outlined. Delay segments on the track are highlighted in Warning Amber or Critical Red.
*   **Buttons:** Flat, geometric. Tactile -1px translate on active state. Primary buttons use Brand Blue fill. Secondary buttons are outline only.
*   **Inputs:** Label above, standard 1px border. Focus ring uses Brand Blue. Error state uses Critical Red border.
*   **Loading States:** Skeletal shimmer matching the exact dimensions of the data rows. No circular spinners for data tables.

## 5. Layout Principles
- **Grid-First:** Strict alignment. Data tables and lists must align on vertical axes to allow rapid scanning by operations teams.
- **Mobile-First Collapse:** Multi-column dashboard layouts collapse to a single scrolling column on mobile.
- **Spatial Separation:** No overlapping elements. Every component lives in its defined cell or card.
- **Map Container (Web):** Full-bleed or large designated grid area for network visualization. The map UI controls should float cleanly over the map with a dark frosted glass effect (`backdrop-filter: blur(8px)`, background `rgba(9,9,11,0.8)`).

## 6. Motion & Interaction
- **Live Updates:** When a number (ETA or delay) updates via WebSocket, use a subtle flash of the semantic color and a smooth tabular number transition.
- **Live Indicators:** A slow, perpetual pulse animation (opacity 1 to 0.4) on the "Live" status dot.
- **Spring Physics:** `stiffness: 100, damping: 20` for modal openings and tab switching. Weighty and deliberate.

## 7. Anti-Patterns (Banned)
- NEVER use generic placeholder names ("John Doe", "Acme"). Use realistic railway data (Train 12301, NDLS, CNB).
- NEVER fabricate AI filler data ("99% AI Accuracy", "12ms response time").
- NEVER use emojis in the UI.
- NEVER use glassmorphism on standard data cards (only allowed on floating map controls).
- NEVER use neon outer glows or massive gradient text.
- NEVER use `Inter` font.
- NEVER overlap text and images.
- NEVER use 3-column equal grids for complex data. Use asymmetric grids (e.g., 25% sidebar, 75% main data view).
