export function chartWidthClass(value: number): string {
  const clamped = Number.isFinite(value) ? Math.max(8, Math.min(100, value)) : 8;
  const stepped = Math.max(5, Math.min(100, Math.round(clamped / 5) * 5));
  return `chart-fill w-pct-${stepped}`;
}
