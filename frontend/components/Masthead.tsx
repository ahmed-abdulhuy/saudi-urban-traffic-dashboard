import { formatDDMMYYYY } from "@/lib/format";

export default function Masthead({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  return (
    <header className="border-b border-stone-900/15">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p className="text-xs tracking-wide text-stone-500">
            King Saud University &middot; Traffic Congestion analysis Research
          </p>
          {/* <p className="text-xs text-stone-500">
            Data window {formatDDMMYYYY(startDate)} &ndash;{" "}
            {formatDDMMYYYY(endDate)}
          </p> */}
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl text-stone-900 leading-tight">
          Riyadh Traffic Congestion Monitor
        </h1>
        <p className="mt-2 max-w-2xl text-stone-700">
          A running record of road congestion across Riyadh, built for
          government planners, journalists, and researchers who need a clear
          read on how the city is moving right now &mdash; and how today
          compares with recent history.
        </p>
      </div>
    </header>
  );
}
