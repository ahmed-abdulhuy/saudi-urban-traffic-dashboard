# Riyadh Traffic Congestion Monitor

A Next.js (App Router) + Tailwind dashboard for the King Saud University
traffic-congestion backend, built for government staff, media, and
researchers who need a fast, credible read on current and historical road
congestion in Riyadh.

## Running it

```bash
npm install
cp .env.local.example .env.local   # point at your FastAPI backend
npm run dev
```

The backend is expected at `NEXT_PUBLIC_API_BASE_URL` (defaults to
`http://localhost:8000`) and must have CORS enabled for the frontend's
origin, since data is fetched both on the server and in the browser
(the history range tabs re-fetch client-side).

## What's on the page

- **Hero** — the latest traffic level index as a large number, plus the
  run's metadata (timestamp, tile coverage, source), next to a live map.
- **Map** — the hexagon grid from `/traffic/latest/hexagons`, colored by
  `congestion_level`, with a hover/tap popup per cell showing the exact
  score and sample size. Base tiles are the free CARTO "Positron" layer
  (no API key required); swap the `TileLayer` URL in
  `components/CongestionMap.tsx` if you'd rather use Mapbox/Google/Esri.
- **Reporting-window summary** — the three headline stats from
  `/city/riyadh` (`minTLI` / `avgTLI` / `maxTLI`).
- **Congestion over time** — a tab switcher over the four history ranges.
  `today`/`yesterday` return raw timestamped points and are drawn as a line
  chart; `last_week`/`last_month` return a time-of-day aggregate and are
  drawn as a mean line with a min–max band, since that's the more useful
  read for a recurring pattern.

## Assumptions worth flagging

- **`/traffic/latest` vs. `/traffic/consgestion_graph`** — both routes in
  the brief return identical payloads and the second looks like a
  typo'd/older path, so the client only calls `/traffic/latest`. Point
  `lib/api.ts` at the other route if that's actually the canonical one.
- **Reading `minTLI`/`maxTLI`** — in the sample payload `minTLI` (0.99) is
  a *higher* number than `maxTLI` (0.90), which only makes sense if the
  index runs toward 1.0 for free-flowing traffic and toward 0 for
  gridlock. `StatCards` labels them by what they mean ("best flow" /
  "most congested") rather than repeating the literal field names, since
  a government or media reader will be confused by "max" pointing at the
  worse number. Worth confirming with whoever defined the schema.
- **No auth/rate-limit info was given**, so requests are unauthenticated;
  add headers in `lib/api.ts` if the real backend needs them.
- **Map library**: React-Leaflet + OpenStreetMap/CARTO tiles, since no
  specific provider or key was specified.

## Design notes

Palette and type were chosen to fit an official Saudi/academic publication
rather than a generic SaaS dashboard: a warm limestone background, a Najdi
green for the institutional identity, and a muted clay for secondary
accents — with the four congestion colors reserved strictly for the data
itself (map, legend, charts) so they stay meaningful rather than
decorative. Headlines use a serif (Newsreader) for institutional weight;
UI and body text use Inter.

## Project structure

```
app/
  layout.tsx        Fonts, metadata
  page.tsx           Server component: fetches city/latest/hexagons/history
  globals.css
components/
  Masthead.tsx        Title block + sponsorship line
  HeroStat.tsx         Big current-index number + run metadata
  MapPanel.tsx        Dynamic (no-SSR) wrapper around the Leaflet map
  CongestionMap.tsx    The actual Leaflet/GeoJSON map
  Legend.tsx           Congestion color key
  StatCards.tsx        min/avg/max TLI cards
  HistoryPanel.tsx     Range tabs + client-side re-fetch + chart switch
  RangeTabs.tsx
  TrendChart.tsx       Line chart for today/yesterday
  TimeOfDayChart.tsx   Mean + band chart for last_week/last_month
  Footer.tsx
lib/
  api.ts     Typed fetch helpers for every backend route
  types.ts   Response/domain types
  format.ts  Display helpers (time formatting, level colors)
```
