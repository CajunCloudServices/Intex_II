export function DetailPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="detail-panel">
      <div className="detail-panel-header">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="detail-panel-body">{children}</div>
    </aside>
  );
}

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
