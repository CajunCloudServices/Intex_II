import { Link } from 'react-router-dom';

export type StaffPortalHeaderAction = {
  label: string;
  to: string;
};

type StaffPortalPageHeaderProps = {
  /** Defaults to `page-header`; use `caseload-header` for the caseload archive layout. */
  className?: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: StaffPortalHeaderAction[];
};

export function StaffPortalPageHeader({
  className = 'page-header',
  eyebrow,
  title,
  description,
  actions,
}: StaffPortalPageHeaderProps) {
  return (
    <div className={className}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && actions.length > 0 ? (
        <div className="page-header-actions">
          {actions.map((action) => (
            <Link key={action.to} className="ghost-button" to={action.to}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
