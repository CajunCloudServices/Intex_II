export function StatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase().replace(/\s+/g, '-');

  return <span className={`status-badge status-${tone}`}>{value}</span>;
}
