# Design System: SIH_ETA (Railway Delay Intelligence)

## 1. Visual Theme & Atmosphere
A highly restrained, data-driven interface with confident, enterprise-grade layouts and structured grid alignments. The atmosphere is professional, clinical yet modern — like a high-end mission control dashboard. Density is balanced (Daily App Balanced) to handle complex network data without overwhelming the operator. Motion is deliberate, utilizing fluid spring-physics for a premium, weighty feel.

## 2. Color Palette & Roles
- **Canvas White** (`#F9FAFB`) — Primary background surface for the application frame.
- **Pure Surface** (`#FFFFFF`) — Card and container fill for clean content elevation.
- **Deep Navy** (`#14213D`) — Primary text, sidebar backgrounds, and absolute high-contrast elements.
- **Primary Blue** (`#3F5FCF`) — The single accent color for CTAs, active states, focus rings, and primary data visualizations.
- **Muted Steel** (`#71717A`) — Secondary text, metadata, table headers, and descriptions.
- **Whisper Border** (`rgba(226,232,240,0.5)`) — Card borders, 1px structural lines.

*(Constraint: Max 1 accent. No purple/neon. No pure black `#000000`.)*

## 3. Typography Rules
- **Display:** `Geist` or `Outfit` — Track-tight, controlled scale, weight-driven hierarchy. Used for KPIs and headers.
- **Body:** `Geist` or `Outfit` — Relaxed leading, 65ch max-width, neutral secondary color for readability.
- **Mono:** `Geist Mono` or `JetBrains Mono` — Mandatory for train IDs, ETA timestamps, route codes, and high-density numbers.
- **Banned:** `Inter`, generic system fonts, and all serif fonts (`Times New Roman`, `Georgia`). 

## 4. Component Stylings
- **Buttons:** Flat, no outer glow. Tactile -1px translate on active. Primary Blue (`#3F5FCF`) fill for primary actions, ghost/outline for secondary.
- **Cards:** Crisp but slightly rounded corners (0.5rem - 1rem). Diffused whisper shadow or flat with subtle border. Used to separate critical metrics. For high-density tables, replace side borders with simple horizontal dividers.
- **Inputs:** Label above, error below. Focus ring in Primary Blue. No floating labels.
- **Loaders:** Skeletal shimmer matching exact layout dimensions. No circular spinners.
- **Badges/Status:** Solid or tinted pills. (e.g. Green for healthy, Red/Amber for congestion/delay) using enterprise-safe, desaturated alert tones.

## 5. Layout Principles
- **Grid-first responsive architecture:** CSS Grid for dashboard layouts.
- **No overlapping elements:** Every element occupies its own clear spatial zone.
- **Header/Nav:** Persistent TopBar and Sidebar (Navy background for Sidebar).
- **Mobile-first:** Strict single-column collapse below 768px.
- **Containment:** Content within max-width boundaries for ultra-wide screens.

## 6. Motion & Interaction
- **Spring physics:** For all interactive elements (`stiffness: 100, damping: 20`) providing a premium, weighty feel.
- **Perpetual micro-loops:** Pulse effects on "Live" train tracking blips or critical congestion nodes.
- **Hover States:** Subtle background shifts or border highlights on table rows and interactive cards.
- **Performance:** Hardware-accelerated transforms only (animate `transform` and `opacity`).

## 7. Anti-Patterns (Banned)
- No emojis anywhere.
- No `Inter` font or Serif fonts.
- No pure black (`#000000`).
- No neon/outer glow shadows or AI "purple" accents.
- No excessive gradient text.
- No 3-column equal grids for feature rows; use functional, asymmetric dashboard distributions.
- No AI copywriting clichés ("Elevate", "Next-Gen").
- No fake/invented metrics (e.g. "99.9% uptime") — use real API data representations or clear placeholders.
- No overlapping elements.
- No custom mouse cursors.
