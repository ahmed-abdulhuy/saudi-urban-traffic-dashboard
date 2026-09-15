# Riyadh Traffic Congestion Intelligence Dashboard — PRD

## Original problem statement
Design a UI for a web dashboard presenting traffic data for Riyadh City only. Core components: a hexagon-based congestion map and an hourly congestion chart. A period selector (Today / Yesterday / Last Week / Last Month) must update every related element EXCEPT the map (map is a static sensor baseline).

## User choices
- Data: mock/simulated Riyadh traffic
- Chart: line/area chart, congestion index 0–100
- Extras: KPI cards, top districts, peak hour, AI insights
- Style: dark obsidian + sand-gold accent, with light desert-linen theme toggle
- Language: English

## Architecture
- Frontend-only React (CRA + Tailwind + shadcn/ui + Recharts + Sonner)
- No backend routes touched (existing status endpoint left untouched)
- Mock dataset in `/app/frontend/src/data/mockData.js` generates:
  - Deterministic 24-hour hourly curves per period
  - District aggregates (6+ Riyadh districts, English + Arabic)
  - Peak-hour buckets, incidents, and AI insight text per period

## Implemented (2026-02)
- Header: brand, live sensor pill, weather pill, district search, live AST clock, theme toggle, export toast
- Period selector (pill toggle group) — updates ALL modules except map
- KPI cards: avg congestion, peak hour, active incidents, avg arterial speed (with % delta vs. last-month baseline)
- Static hexagon SVG map of Riyadh with:
  - Riyadh-shaped hex mask
  - Congestion legend, layer toggles (grid/incidents/arterials/boundaries)
  - Zoom controls, hex hover tooltips, pulsing incident markers, arterial paths
  - "Static Base Map" indicator badge
- Hourly congestion Recharts area chart with morning & evening peak bands + peak-hour reference line
- Top districts ranked list with progress bars, trend deltas, speed & delay
- Peak hour distribution (morning / midday / evening / night)
- Live incidents feed with severity dots, status pills
- AI Mobility Analyst panel with headline / bottleneck / root cause / recommendation
- Dark + light theme toggle (persisted in localStorage)

## Backlog (P1/P2)
- Real API wiring (once data source is provided)
- Arabic RTL layout
- Comparison mode (period vs. period side-by-side)
- Export to actual PDF/CSV
- Heatmap intensity slider on the hex map
- Notification center for critical incidents
