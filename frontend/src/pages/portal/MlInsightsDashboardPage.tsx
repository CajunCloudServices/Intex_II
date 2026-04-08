import { useParams } from 'react-router-dom';

export function MlInsightsDashboardPage() {
  const { dashboardKey } = useParams();
  const base = import.meta.env.BASE_URL;
  const dashboardPathByKey: Record<string, string> = {
    counseling: 'counseling-admin-dashboard.html',
    donor: 'donor-churn-dashboard.html',
    reintegration: 'reintegration-dashboard.html',
    social: 'social-media-dashboard.html',
  };
  const selectedPath = dashboardPathByKey[dashboardKey ?? ''] ?? 'counseling-admin-dashboard.html';
  const src = `${base}ml-dashboards/${selectedPath}?embed=1`;

  return (
    <div className="ml-insights-page">
      <iframe className="ml-insights-frame" title="Tanglaw ML insight dashboards" src={src} />
    </div>
  );
}
