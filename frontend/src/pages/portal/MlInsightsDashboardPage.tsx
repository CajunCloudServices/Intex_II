export function MlInsightsDashboardPage() {
  const base = import.meta.env.BASE_URL;
  const src = `${base}ml-dashboards/counseling-admin-dashboard.html`;

  return (
    <div className="ml-insights-page">
      <iframe className="ml-insights-frame" title="Tanglaw ML insight dashboards" src={src} />
    </div>
  );
}
