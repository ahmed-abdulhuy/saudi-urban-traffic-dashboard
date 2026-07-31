interface MonthlyChartData {
  months: string[];
  y2025: number[];
  y2024: number[];
}

interface MonthlyChartProps {
  data: MonthlyChartData;
}

export default function MonthlyChart({
  data,
}: MonthlyChartProps): React.JSX.Element {
  const { months, y2025, y2024 } = data;
  const maxValue = Math.max(...y2025, ...y2024);

  return (
    <>
      <div className="month-labels">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>

      <div className="bars">
        {months.map((month, index) => (
          <div className="bar-group" key={month}>
            <div
              className="bar y2025"
              style={{
                height: `${(y2025[index] / maxValue) * 100}%`,
              }}
            />

            <div
              className="bar y2024"
              style={{
                height: `${(y2024[index] / maxValue) * 100}%`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="legend">
        <span>
          <span
            className="dot"
            style={{ background: "var(--accent-red)" }}
          />
          2025
        </span>

        <span>
          <span
            className="dot"
            style={{ background: "var(--accent-blue)" }}
          />
          2024
        </span>
      </div>
    </>
  );
}