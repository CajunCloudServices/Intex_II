import { Navigate, useParams } from 'react-router-dom';

const REPORT_FILES: Record<string, string> = {
  counseling: 'counseling-admin-dashboard.html',
  donor: 'donor-churn-dashboard.html',
  reintegration: 'reintegration-dashboard.html',
  social: 'social-media-dashboard.html',
};

const VALID_SLUGS = new Set(Object.keys(REPORT_FILES));

export function MlInsightsDashboardPage() {
  const { report } = useParams<{ report: string }>();
  const slug = report && VALID_SLUGS.has(report) ? report : null;

  if (report && !slug) {
    return <Navigate to="/portal/ml-insights/counseling" replace />;
  }

  const file = REPORT_FILES[slug ?? 'counseling'];
  const base = import.meta.env.BASE_URL;
  const src = `${base}ml-dashboards/${file}?embed=1`;

  return (
    <div className="ml-insights-page">
      <iframe className="ml-insights-frame" title="Tanglaw ML insight dashboards" src={src} />
    </div>
  );
}
