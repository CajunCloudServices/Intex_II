import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { DashboardSummary } from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime, formatMoney } from '../../lib/format';

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadSummary = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      setSummary(await api.dashboardSummary(token));
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, [token]);

  if (!token) return null;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Staff command center</span>
          <h1>Admin dashboard</h1>
          <p>Live summary metrics from residents, donations, safehouses, home visits, and outreach tables.</p>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading dashboard summary..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSummary} />
      ) : summary ? (
        <>
          <section className="page-grid four">
            <MetricCard label="Active residents" value={String(summary.activeResidents)} detail="Current active caseload across safehouses." accent />
            <MetricCard label="Safehouses" value={String(summary.safehouseCount)} detail="Configured operating locations." />
            <MetricCard label="Donations this month" value={formatMoney(summary.donationsThisMonth)} detail="Monetary total from current-month records." />
            <MetricCard label="Open plans" value={String(summary.openInterventionPlans)} detail="Intervention plans still in progress." />
          </section>

          <section className="page-grid two">
            <SectionCard title="Recent donations" subtitle="Starter list from the backend summary endpoint">
              <DataTable
                columns={['Supporter', 'Amount', 'Date', 'Type']}
                rows={summary.recentDonations.map((donation) => [
                  donation.supporterName,
                  formatMoney(donation.amount),
                  donation.donationDate,
                  donation.donationType,
                ])}
                emptyMessage="No donations have been loaded yet."
                caption="Recent supporter activity"
              />
            </SectionCard>

            <SectionCard title="Safehouse utilization" subtitle="Simple occupancy view for the dashboard">
              <DataTable
                columns={['Safehouse', 'Occupancy', 'Capacity']}
                rows={summary.safehouseUtilization.map((safehouse) => [
                  safehouse.safehouseName,
                  safehouse.currentOccupancy,
                  safehouse.capacityGirls,
                ])}
                emptyMessage="No safehouse records are available."
                caption="Current occupancy by location"
              />
            </SectionCard>
          </section>

          <SectionCard title="Dashboard notes" subtitle="Helpful for demos and student walkthroughs">
            <ul className="simple-list">
              <li>Last refreshed: {lastUpdated ? formatDateTime(lastUpdated) : 'Just now'}</li>
              <li>This view is powered by the summary endpoint, so it stays fast.</li>
              <li>Any delete action elsewhere in the app should still require explicit confirmation.</li>
            </ul>
          </SectionCard>
        </>
      ) : (
        <EmptyState title="No dashboard data" message="The summary endpoint returned no data yet." />
      )}
    </div>
  );
}
