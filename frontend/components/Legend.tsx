const ITEMS: { level: string; label: string; color: string }[] = [
  { level: "free_flow", label: "Free flow", color: "rgb(43,200,43)" },
  { level: "moderate", label: "Moderate", color: "rgb(214,190,20)" },
  { level: "heavy", label: "Heavy", color: "rgb(214,60,60)" },
  { level: "severe", label: "Severe", color: "rgb(119,119,119)" },
];

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-700">
      {ITEMS.map((item) => (
        <span key={item.level} className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
