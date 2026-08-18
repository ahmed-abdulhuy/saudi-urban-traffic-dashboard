export const metadata = {
  title: "About | Saudi Urban Traffic Observatory",
  description:
    "A data-driven framework for analyzing urban traffic congestion in major Saudi Arabian cities using TomTom traffic raster maps.",
};

const CITIES = [
  { name: "Riyadh", lat: 24.7136, lon: 46.6753 },
  { name: "Jeddah", lat: 21.5294, lon: 39.1611 },
  { name: "Dammam", lat: 26.4241, lon: 50.0905 },
  { name: "Al Khobar", lat: 26.2199, lon: 50.1932 },
  { name: "Dhahran", lat: 26.2381, lon: 50.043 },
  { name: "Al Qatif", lat: 26.5781, lon: 49.9985 },
];

const TRAFFIC_STATES = [
  { state: "Severe Congestion", speed: "0 ≤ speed < 0.01", weight: "0.005", color: "#777777" },
  { state: "Heavy Congestion", speed: "0.01 ≤ speed < 0.8", weight: "0.405", color: "#FF2323" },
  { state: "Moderate Traffic", speed: "0.8 ≤ speed < 1", weight: "0.9", color: "#FFFF37" },
  { state: "Free Flow", speed: "speed = 1", weight: "1.0", color: "#2BC82B" },
];

const FINDINGS = [
  {
    city: "Riyadh",
    points: [
      "Highest overall congestion levels",
      "Persistent congestion throughout the day",
      "Major hotspots: King Fahd Road, Southern & Northern Ring Roads, Makkah Al Mukarramah Road",
    ],
  },
  {
    city: "Jeddah",
    points: [
      "More spatially distributed congestion",
      "Significant congestion on Al Haramain Road, Al-Madinah Al-Munawarah Road, King Abdulaziz Road",
    ],
  },
  {
    city: "Dammam Metropolitan",
    points: [
      "Localized congestion behavior",
      "Strong congestion around Dhahran-Jubail Expressway, King Fahd Road, Al Adamah district",
    ],
  },
  {
    city: "Dhahran",
    points: ["Lowest average congestion levels", "Mostly localized traffic peaks"],
  },
  {
    city: "Al Khobar",
    points: ["Congestion concentrated on major corridors", "Significant weekend traffic variation"],
  },
  {
    city: "Al Qatif",
    points: ["Moderate localized congestion", "Concentrated at intersections and causeways"],
  },
];

export default function AboutPage() {
  return (
    <div className="wrap">
      <div className="eyebrow">Traffic overview</div>
      <h1 className="title">Saudi Urban Traffic Observatory</h1>

      <div className="section-2025">
        <h2 className="section-title">What this is</h2>
        <p className="section-desc" style={{ maxWidth: 680 }}>
          A data-driven framework for analyzing urban traffic congestion in major Saudi
          Arabian cities, built on color-coded raster traffic tiles from the TomTom
          Traffic Flow API. It turns those visual maps into quantitative congestion
          metrics and spatial-temporal traffic intelligence: a Traffic Load Index (TLI)
          and its inverse, pixel-level congestion analysis, traffic load heatmaps,
          congestion onset detection, and spatial-temporal propagation modeling.
        </p>
        <p className="section-desc" style={{ maxWidth: 680 }}>
          Source code:{" "}
          <a
            href="https://github.com/ahmed-abdulhuy/saudi-urban-traffic-observatory"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/ahmed-abdulhuy/saudi-urban-traffic-observatory
          </a>
        </p>

        <h2 className="section-title" style={{ marginTop: 32 }}>
          Objectives
        </h2>
        <div className="stat-grid">
          <div className="card">
            <div className="label">Quantify spatial congestion intensity</div>
            <div className="sub">
              Detect congestion hotspots, identify overloaded road segments, and measure
              city-wide congestion using TLI.
            </div>
          </div>
          <div className="card">
            <div className="label">Model congestion emergence</div>
            <div className="sub">
              Detect congestion onset time, analyze propagation, and visualize activation
              sequences across road networks.
            </div>
          </div>
          <div className="card">
            <div className="label">Analyze behavioral drivers</div>
            <div className="sub">
              Compare weekday and weekend traffic patterns, and differentiate commuting
              from social/commercial traffic.
            </div>
          </div>
          <div className="card">
            <div className="label">Evaluate cross-city variability</div>
            <div className="sub">
              Compare congestion behavior across six Saudi cities and study the impact of
              urban structure and population density.
            </div>
          </div>
        </div>

        <h2 className="section-title" style={{ marginTop: 32 }}>
          Dataset
        </h2>
        <p className="section-desc" style={{ maxWidth: 680 }}>
          Traffic raster tiles were collected from the{" "}
          <a
            href="https://developer.tomtom.com/traffic-api/documentation/tomtom-maps/traffic-flow/raster-flow-tiles"
            target="_blank"
            rel="noopener noreferrer"
          >
            TomTom Traffic Flow raster API
          </a>{" "}
          between April 1–15, 2026, across six cities. Riyadh was monitored around the
          clock (a snapshot every 15 minutes); the other five cities were sampled during
          weekday commute windows (6–9 AM, 2–5 PM) and Friday afternoons (4–8 PM). Each
          snapshot stitches together 169 tiles (zoom level 14, 512px tiles, radius 6).
        </p>

        <table className="about-table">
          <thead>
            <tr>
              <th>City</th>
              <th>Latitude</th>
              <th>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {CITIES.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{c.lat}</td>
                <td>{c.lon}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="section-title" style={{ marginTop: 32 }}>
          Methodology
        </h2>
        <p className="section-desc" style={{ maxWidth: 680 }}>
          Raw raster images contain thousands of intermediate shades from anti-aliasing
          and color blending. To normalize traffic states, each pixel&apos;s color is compared
          (Euclidean distance) against four predefined traffic colors, assigned to the
          nearest class, and discarded if it falls outside a threshold distance of{" "}
          <strong>110.06</strong>.
        </p>

        <table className="about-table">
          <thead>
            <tr>
              <th>Traffic state</th>
              <th>Speed ratio</th>
              <th>TLI weight</th>
              <th>Color</th>
            </tr>
          </thead>
          <tbody>
            {TRAFFIC_STATES.map((t) => (
              <tr key={t.state}>
                <td>{t.state}</td>
                <td>{t.speed}</td>
                <td>{t.weight}</td>
                <td>
                  <span className="about-swatch" style={{ background: t.color }} />
                  {t.color}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="section-desc" style={{ maxWidth: 680, marginTop: 16 }}>
          The <strong>Traffic Load Index (TLI)</strong> is the weighted average of these
          congestion weights across all classified pixels in a snapshot; the{" "}
          <strong>inverse TLI</strong> (1 / TLI) improves interpretability and reduces
          metric variance. Aggregating TLI pixel-by-pixel over time produces traffic load
          heatmaps that reveal hotspots, overloaded intersections, and persistent
          bottlenecks. Congestion <strong>onset time</strong> for a location is the first
          timestamp at which its congestion score crosses a fixed threshold — mapping
          onset times across the network shows where congestion begins and how it
          propagates.
        </p>

        <h2 className="section-title" style={{ marginTop: 32 }}>
          Key findings
        </h2>
        <div className="stat-grid">
          {FINDINGS.map((f) => (
            <div className="card" key={f.city}>
              <div className="label">{f.city}</div>
              <ul className="about-list">
                {f.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="section-desc" style={{ maxWidth: 680, marginTop: 16 }}>
          Across cities, weekdays show strong commuting-driven congestion with clear
          morning/afternoon peaks and arterial-road activation patterns. Weekends show
          more distributed congestion, more neighborhood traffic, and later congestion
          onset times.
        </p>

        <h2 className="section-title" style={{ marginTop: 32 }}>
          This dashboard
        </h2>
        <p className="section-desc" style={{ maxWidth: 680 }}>
          The numbers on the city pages here are illustrative sample data, defined in{" "}
          <code>data/cities.js</code> — a stand-in for the real TLI/congestion output the
          Observatory pipeline produces. Swapping that file&apos;s data-fetching function for
          the pipeline&apos;s real output (e.g. a TomTom raster processed into an hourly
          hexagon layer) is the intended next step, without needing to change any page or
          component code.
        </p>
      </div>
    </div>
  );
}