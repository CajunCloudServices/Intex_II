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
          <p>Track daily operations across residents, safehouses, giving activity, and upcoming case decisions.</p>
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

          <section className="page-grid three">
            <MetricCard label="High-risk residents" value={String(summary.highRiskResidents)} detail="Residents currently flagged high or critical risk." accent />
            <MetricCard label="Visits needing follow-up" value={String(summary.visitsNeedingFollowUp)} detail="Home or field visits that still need action." />
            <MetricCard label="Open incidents" value={String(summary.openIncidents)} detail="Incident reports that remain unresolved." />
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

          <section className="page-grid two">
            <SectionCard title="Upcoming case conferences" subtitle="Scheduled resident reviews that need attention soon">
              <DataTable
                columns={['Resident', 'Conference date', 'Lead worker', 'Status']}
                rows={summary.upcomingCaseConferences.map((conference) => [
                  conference.residentCode,
                  conference.conferenceDate,
                  conference.leadWorker,
                  conference.status,
                ])}
                emptyMessage="No upcoming case conferences are scheduled."
                caption="Upcoming case conferences"
              />
            </SectionCard>

            <SectionCard title="Progress summary" subtitle="Operational signals from counseling and follow-up workflows">
              <ul className="simple-list">
                <li>Last refreshed: {lastUpdated ? formatDateTime(lastUpdated) : 'Just now'}</li>
                <li>{summary.progressSummary.progressNoted} process recordings flagged measurable progress.</li>
                <li>{summary.progressSummary.concernsFlagged} process recordings flagged concerns for follow-up.</li>
                <li>{summary.progressSummary.referralsMade} sessions resulted in a referral or escalation.</li>
              </ul>
            </SectionCard>
          </section>
      </>
      ) : (
        <EmptyState title="No dashboard data" message="The summary endpoint returned no data yet." />
      )}
    </div>
  );
}
