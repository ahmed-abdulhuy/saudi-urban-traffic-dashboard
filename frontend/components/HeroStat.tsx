import { formatDateTime, tliToPercent } from "@/lib/format";
import type { CongestionRun } from "@/lib/types";

export default function HeroStat({ run }: { run: CongestionRun }) {
  const pct = tliToPercent(run.congestion_index);

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <p className="text-xs tracking-wide text-stone-500">
          Current traffic level index
        </p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-display text-7xl sm:text-8xl text-najdi leading-none">
            {run.congestion_index.toFixed(2)}
          </span>
          <span className="text-stone-500 text-sm">/ 1.00</span>
        </div>
        <p className="mt-3 text-stone-700 max-w-xs">
          Roads are running at roughly{" "}
          {/*TODO: Consider making the percentage color coded based on congestion status*/}
          <span className="font-medium text-stone-900">{pct}%</span> of free
          flow speed across the monitored area.
        </p>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-stone-900/10 pt-4">
        <div>
          <dt className="text-stone-500">As of</dt>
          <dd className="text-stone-900">{formatDateTime(run.timestamp)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Coverage</dt>
          <dd className="text-stone-900">
            {run.tile_grid_size[0]}&times;{run.tile_grid_size[1]} tiles,
            radius {run.radius}
          </dd>
        </div>
        {/* <div>
          <dt className="text-stone-500">Source</dt>
          <dd className="text-stone-900">{run.api}</dd>
        </div> */}
        <div>
          <dt className="text-stone-500">Tiles resolved</dt>
          <dd className="text-stone-900">
            {run.tiles_requested - run.tiles_failed} / {run.tiles_requested}
          </dd>
        </div>
      </dl>
    </div>
  );
}
