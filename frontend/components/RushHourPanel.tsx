"use client";

import { useState } from "react";
import CityMetroToggle from "./CityMetroToggle";

interface RushHourPeriod {
  congestion: string;
  baseSpeedKmh: number;
}

interface RushHour {
  morning: RushHourPeriod;
  evening: RushHourPeriod;
}

interface RushHourPanelProps {
  rushHour: RushHour;
}

function formatTime(hours: number): string {
  const totalSeconds = Math.round(hours * 3600);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;
}

export default function RushHourPanel({
  rushHour,
}: RushHourPanelProps): React.JSX.Element {
  const [distance, setDistance] = useState<number>(10);

  const { morning, evening } = rushHour;

  return (
    <div className="section-rush">
      <h2 className="section-title">
        How busy did this city get during rush hour?
      </h2>

      <p className="section-desc">
        Take a look at the details, such as average speed and the extra time
        spent sitting in traffic, over a chosen distance.
      </p>

      <div className="slider-row">
        <span className="slabel">Distance</span>

        <span style={{ fontSize: 11, color: "var(--muted)" }}>1</span>

        <input
          type="range"
          min={1}
          max={50}
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
        />

        <span style={{ fontSize: 11, color: "var(--muted)" }}>50</span>

        <div className="unit-toggle">
          <button className="active">km</button>
          <button>mi</button>
        </div>

        <CityMetroToggle />
      </div>

      <div className="rush-grid">
        <div className="rush-card">
          <div className="rush-icon">☀️</div>

          <div className="rush-detail">
            <div className="rush-name">
              Morning
              <br />
              <small>rush hour</small>
            </div>

            <div className="row-top">
              Time taken to travel {distance} km
            </div>

            <div className="time">
              {formatTime(distance / morning.baseSpeedKmh)}
            </div>

            <div className="rush-metrics">
              <div>
                <div className="v">{morning.congestion}</div>
                <div className="l">Average congestion level</div>
              </div>

              <div>
                <div className="v">
                  {morning.baseSpeedKmh.toFixed(1)} km/h
                </div>
                <div className="l">Average speed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rush-card">
          <div className="rush-icon">🌙</div>

          <div className="rush-detail">
            <div className="rush-name">
              Evening
              <br />
              <small>rush hour</small>
            </div>

            <div className="row-top">
              Time taken to travel {distance} km
            </div>

            <div className="time">
              {formatTime(distance / evening.baseSpeedKmh)}
            </div>

            <div className="rush-metrics">
              <div>
                <div className="v">{evening.congestion}</div>
                <div className="l">Average congestion level</div>
              </div>

              <div>
                <div className="v">
                  {evening.baseSpeedKmh.toFixed(1)} km/h
                </div>
                <div className="l">Average speed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}