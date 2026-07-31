"use client";

import { useState } from "react";

const VIEW_MODES = ["city", "metro"] as const;

type ViewMode = (typeof VIEW_MODES)[number];

export default function CityMetroToggle(): React.JSX.Element {
  const [value, setValue] = useState<ViewMode>("city");

  return (
    <div className="toggle">
      <button
        className={value === "city" ? "active" : ""}
        onClick={() => setValue("city")}
      >
        City
      </button>

      <button
        className={value === "metro" ? "active" : ""}
        onClick={() => setValue("metro")}
      >
        Metro
      </button>
    </div>
  );
}