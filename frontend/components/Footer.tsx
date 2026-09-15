export default function Footer() {
  return (
    <footer className="border-t border-stone-900/15 mt-16">
      <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-stone-500 flex flex-wrap justify-between gap-2">
        {/* <p>
          Traffic flow data sourced from TomTom Traffic Flow Raster,
          processed into a hexagon grid over central Riyadh.
        </p> */}
        <p>Published by King Saud University &middot; for research and public use.</p>
      </div>
    </footer>
  );
}
