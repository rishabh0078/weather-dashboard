export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((entry, i) => (
        <div className="tooltip-item" key={i}>
          <span className="tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}:</span>
          <strong>{formatter ? formatter(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
}
