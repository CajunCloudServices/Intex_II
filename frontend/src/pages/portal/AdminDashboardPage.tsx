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
    <div className="page-shell dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Operations Overview</span>
          <h1>Staff Operations Dashboard</h1>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading dashboard summary..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSummary} />
      ) : summary ? (
        <>
          <section className="dashboard-metrics" aria-label="Summary metrics">
            <article className="dashboard-metric-card dashboard-metric-card-teal">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-icon" aria-hidden="true">
                  Cases
                </span>
                <span className="dashboard-metric-label">Active Cases</span>
              </div>
              <div>
                <strong>{summary.activeResidents}</strong>
                <p>{summary.homeVisitsThisMonth} home visits logged this month</p>
              </div>
            </article>

            <article className="dashboard-metric-card">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-icon" aria-hidden="true">
                  Stay
                </span>
                <span className="dashboard-metric-label">Avg Stay Proxy</span>
              </div>
              <div>
                <strong>{Math.max(summary.openInterventionPlans * 3, 12)} Days</strong>
                <p>{summary.openInterventionPlans} open plans currently being tracked</p>
              </div>
            </article>

            <article className="dashboard-metric-card">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-icon" aria-hidden="true">
                  Reach
                </span>
                <span className="dashboard-metric-label">Outreach Activity</span>
              </div>
              <div>
                <strong>{summary.socialPostsThisMonth}</strong>
                <p>Social posts published this month</p>
              </div>
            </article>

            <article className="dashboard-metric-card dashboard-metric-card-gold">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-icon" aria-hidden="true">
                  Give
                </span>
                <span className="dashboard-metric-label">Donations This Month</span>
              </div>
              <div>
                <strong>{formatMoney(summary.donationsThisMonth)}</strong>
                <p>{summary.recentDonations.length} recent gifts in the summary feed</p>
              </div>
            </article>
          </section>

          <section className="dashboard-grid">
            <SectionCard
              title="Recent Donations"
              subtitle="Live activity drawn from the dashboard summary endpoint"
              actions={
                <button className="dashboard-link-button" type="button">
                  View all records
                </button>
              }
            >
              {summary.recentDonations.length > 0 ? (
                <div className="dashboard-timeline" role="list">
                  {summary.recentDonations.slice(0, 4).map((donation, index) => (
                    <article className="dashboard-timeline-item" key={donation.donationId} role="listitem">
                      <div
                        className={`dashboard-timeline-dot${index === 0 ? ' dashboard-timeline-dot-highlight' : ''}`}
                        aria-hidden="true"
                      />
                      <div className="dashboard-timeline-card">
                        <div>
                          <p className="dashboard-timeline-title">{donation.supporterName}</p>
                          <p className="dashboard-timeline-meta">
                            {donation.donationType} gift recorded on {formatDateTime(donation.donationDate)}
                          </p>
                        </div>
                        <div className="dashboard-timeline-side">
                          <span
                            className={`dashboard-pill${
                              index === 0 ? ' dashboard-pill-attention' : ' dashboard-pill-processed'
                            }`}
                          >
                            {index === 0 ? 'Pending Review' : 'Processed'}
                          </span>
                          <strong>{formatMoney(donation.amount)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No recent donations" message="The summary feed does not have donation activity yet." />
              )}
            </SectionCard>

            <div className="dashboard-side-column">
              <SectionCard title="Safehouse Occupancy" subtitle="Current utilization from active locations">
                {summary.safehouseUtilization.length > 0 ? (
                  <div className="occupancy-list">
                    {summary.safehouseUtilization.map((safehouse) => {
                      const percent = safehouse.capacityGirls
                        ? Math.min(100, Math.round((safehouse.currentOccupancy / safehouse.capacityGirls) * 100))
                        : 0;

                      return (
                        <article className="occupancy-item" key={safehouse.safehouseName}>
                          <div className="occupancy-item-head">
                            <div>
                              <strong>{safehouse.safehouseName}</strong>
                              <p>{percent >= 80 ? 'Approaching capacity' : 'Stable occupancy mix'}</p>
                            </div>
                            <span>
                              {safehouse.currentOccupancy} / {safehouse.capacityGirls}
                            </span>
                          </div>
                          <div className="occupancy-bar" aria-hidden="true">
                            <div style={{ width: `${percent}%` }} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="No safehouse records" message="The dashboard summary did not include occupancy data." />
                )}
              </SectionCard>

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
