import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { DashboardSummary, DonationTrends, SafehousePerformanceSummary, SocialAnalytics } from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime, formatMoney } from '../../lib/format';

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [donationTrends, setDonationTrends] = useState<DonationTrends | null>(null);
  const [safehousePerformance, setSafehousePerformance] = useState<SafehousePerformanceSummary | null>(null);
  const [socialAnalytics, setSocialAnalytics] = useState<SocialAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadSummary = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [dashboard, trends, safehouses, social] = await Promise.all([
        api.dashboardSummary(token),
        api.donationTrends(token),
        api.safehousePerformance(token),
        api.socialAnalytics(token),
      ]);
      setSummary(dashboard);
      setDonationTrends(trends);
      setSafehousePerformance(safehouses);
      setSocialAnalytics(social);
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

          <section className="page-grid four">
            <MetricCard
              label="Total funding tracked"
              value={formatMoney(donationTrends?.monthlyTotals.reduce((sum, point) => sum + point.totalAmount, 0) ?? 0)}
              detail="Total donation volume in current trend history."
              accent
            />
            <MetricCard
              label="Social impressions"
              value={(socialAnalytics?.totals.totalImpressions ?? 0).toLocaleString()}
              detail="Total social impressions across tracked posts."
            />
            <MetricCard
              label="Social referrals"
              value={String(socialAnalytics?.totals.totalDonationReferrals ?? 0)}
              detail="Donation referrals attributed to social posts."
            />
            <MetricCard
              label="Avg engagement"
              value={`${((socialAnalytics?.totals.avgEngagementRate ?? 0) * 100).toFixed(1)}%`}
              detail="Average engagement across social channels."
            />
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
                  <StatusBadge key={`conf-status-${conference.residentCode}`} value={conference.status} />,
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

          <section className="page-grid two">
            <SectionCard title="Safehouse capacity trend" subtitle="Occupancy and recent health trend by safehouse">
              <DataTable
                columns={['Safehouse', 'Occupancy', 'Health trend']}
                rows={(safehousePerformance?.safehouses ?? []).map((safehouse) => {
                  const trend = safehousePerformance?.monthlyTrends.find((item) => item.safehouseId === safehouse.safehouseId);
                  const latestScore = trend?.monthlyTrend.at(-1)?.avgHealthScore ?? 0;
                  return [
                    safehouse.safehouseName,
                    `${safehouse.currentOccupancy}/${safehouse.capacityGirls}`,
                    latestScore > 0 ? latestScore.toFixed(1) : 'N/A',
                  ];
                })}
                emptyMessage="No safehouse trend data is available."
                caption="Safehouse occupancy and health indicators"
              />
            </SectionCard>

            <SectionCard title="Top social posts" subtitle="Recent social content driving referrals">
              <DataTable
                columns={['Platform', 'Type', 'Referrals', 'Engagement']}
                rows={(socialAnalytics?.posts ?? []).slice(0, 8).map((post) => [
                  post.platform,
                  post.postType,
                  post.donationReferrals,
                  `${(post.engagementRate * 100).toFixed(1)}%`,
                ])}
                emptyMessage="No social post analytics available."
                caption="Recent social performance"
              />
            </SectionCard>
          </section>
      </>
      ) : (
        <EmptyState title="No dashboard data" message="The summary endpoint returned no data yet." />
      )}
    </div>
  );
}
