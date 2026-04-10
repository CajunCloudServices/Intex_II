export function chartWidthClass(value: number): string {
  // Bucket widths to the generated utility classes so chart bars stay visually stable between nearby values.
  const clamped = Number.isFinite(value) ? Math.max(8, Math.min(100, value)) : 8;
  const stepped = Math.max(5, Math.min(100, Math.round(clamped / 5) * 5));
  return `chart-fill w-pct-${stepped}`;
}
