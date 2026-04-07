import type { ReactNode } from 'react';

export function MetricCard({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className={`metric-card${accent ? ' metric-card-accent' : ''}`}>
      <h3 className="metric-card-label">{label}</h3>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export function SectionCard({
  title,
  titleId,
  subtitle,
  actions,
  children,
}: {
  title: string;
  titleId?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-card-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function FloatingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-card floating-card${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
