// import Image from "next/image";
// interface Stat {
//   value: string;
//   // sub: string;
// }

// export interface Stats {
//   minTLI: Stat;
//   avgTLI: Stat;
//   maxTLI: Stat;
// }

// // interface WorstDay {
// //   date: string;
// //   avgTLI: string;
// //   maxTLI: string;
// //   minTLI: string;
// // }

// interface StatCardsProps {
//   stats: Stats;
//   // worstDay: WorstDay;
// }

// export default function StatCards({
//   stats,
//   // worstDay,
// }: StatCardsProps): React.JSX.Element {
//   return (
//     <div className="stat-grid">
//       <div className="card">
//         <div className="label">Average TLI Value</div>
//         <div className="value">{stats.avgTLI.value}</div>
//       </div>

//       <div className="card">
//         <div className="label">Min TLI Value</div>
//         <div className="value">{stats.minTLI.value}</div>
//       </div>

//       <div className="card">
//         <div className="label">Max TLI Value</div>
//         <div className="value">{stats.maxTLI.value}</div>
//       </div>

//       {/* <div className="card worst">
//         <div className="label">Worst day to travel</div>

//         <div className="day">{worstDay.date}</div>

//         <div className="worst-stats">
//           <div>
//             <div className="v">{worstDay.avgCongestion}</div>
//             <div className="l">Average congestion level</div>
//           </div>

//           <div>
//             <div className="v">{worstDay.congestionAt5pm}</div>
//             <div className="l">Congestion level at 5pm</div>
//           </div>

//           <div>
//             <div className="v">{worstDay.distanceIn15minAt5pm}</div>
//             <div className="l">Distance driven in 15 min at 5pm</div>
//           </div>
//         </div>
//       </div> */}

//     </div>
//   );
// }


import type { CityInfo } from "@/lib/types";

export default function StatCards({ city }: { city: CityInfo }) {
  const items = [
    { label: "Lowest recorded (best flow)", value: city.stats.minTLI.value },
    { label: "Average over window", value: city.stats.avgTLI.value },
    { label: "Highest recorded (most congested)", value: city.stats.maxTLI.value },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 border border-stone-900/10 divide-y sm:divide-y-0 sm:divide-x divide-stone-900/10">
      {items.map((item) => (
        <div key={item.label} className="p-5">
          <p className="text-xs text-stone-500">{item.label}</p>
          <p className="mt-1 font-display text-3xl text-stone-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
