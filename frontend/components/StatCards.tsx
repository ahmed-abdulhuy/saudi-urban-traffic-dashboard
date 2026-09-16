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
