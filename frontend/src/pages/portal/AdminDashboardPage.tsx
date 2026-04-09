import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { DashboardSummary, SafehousePerformanceSummary, SocialAnalytics } from '../../api/types';
import { SectionCard } from '../../components/ui/Cards';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import { combineUnavailableSections, describeUnavailableSection, getRequestErrorMessage } from '../../lib/loadMessages';

const OCCUPANCY_PAGE_SIZE = 5;
const CONFERENCE_PAGE_SIZE = 5;
const SOCIAL_PAGE_SIZE = 6;

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [safehousePerformance, setSafehousePerformance] = useState<SafehousePerformanceSummary | null>(null);
  const [socialAnalytics, setSocialAnalytics] = useState<SocialAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [occupancyPage, setOccupancyPage] = useState(1);
  const [conferencePage, setConferencePage] = useState(1);
  const [socialPage, setSocialPage] = useState(1);

  const loadSummary = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setLoadWarning(null);
    try {
      const [dashboardResult, safehousesResult, socialResult] = await Promise.allSettled([
        api.dashboardSummary(),
        api.safehousePerformance(),
        api.socialAnalytics(),
      ]);
      const warnings: string[] = [];

      if (dashboardResult.status === 'fulfilled') {
        setSummary(dashboardResult.value);
        setLastUpdated(new Date().toISOString());
      } else {
        setSummary(null);
        setError(getRequestErrorMessage(dashboardResult.reason, 'Failed to load dashboard.'));
      }

      if (safehousesResult.status === 'fulfilled') {
        setSafehousePerformance(safehousesResult.value);
      } else {
        setSafehousePerformance(null);
        warnings.push(describeUnavailableSection('Safehouse performance', safehousesResult.reason, 'Occupancy trends are unavailable.'));
      }

      if (socialResult.status === 'fulfilled') {
        setSocialAnalytics(socialResult.value);
      } else {
        setSocialAnalytics(null);
        warnings.push(describeUnavailableSection('Social analytics', socialResult.reason, 'Top social posts are unavailable.'));
      }

      setLoadWarning(combineUnavailableSections(warnings));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSummary(); }, [user]);

  if (!user) return null;

  const allSafehouses = summary?.safehouseUtilization ?? [];
  const pagedOccupancy = allSafehouses.slice(
    (occupancyPage - 1) * OCCUPANCY_PAGE_SIZE,
    occupancyPage * OCCUPANCY_PAGE_SIZE,
  );

  const allConferences = summary?.upcomingCaseConferences ?? [];
  const pagedConferences = allConferences.slice(
    (conferencePage - 1) * CONFERENCE_PAGE_SIZE,
    conferencePage * CONFERENCE_PAGE_SIZE,
  );

  const allSocialPosts = socialAnalytics?.posts ?? [];
  const pagedSocial = allSocialPosts.slice(
    (socialPage - 1) * SOCIAL_PAGE_SIZE,
    socialPage * SOCIAL_PAGE_SIZE,
  );

  return (
    <div className="page-shell admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <span className="eyebrow">Command Center</span>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-dashboard-header-right">
          {lastUpdated && (
            <span className="admin-last-updated">Updated {formatDateTime(lastUpdated)}</span>
          )}
          <button className="ghost-button" onClick={() => void loadSummary()} type="button">
            Refresh
          </button>
        </div>
      </div>

      {loadWarning ? <FeedbackBanner tone="info" message={loadWarning} /> : null}

      {loading ? (
        <LoadingState label="Loading dashboard..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSummary} />
      ) : summary ? (
        <>
          {/* ── Metric strip ── */}
          <section className="admin-metrics" aria-label="Key metrics">
            <article className="admin-metric-card admin-metric-teal">
              <span className="admin-metric-label">Active residents</span>
              <strong>{summary.activeResidents}</strong>
              <p>{summary.homeVisitsThisMonth} home visits this month</p>
            </article>

            <article className="admin-metric-card">
              <span className="admin-metric-label">Open plans</span>
              <strong>{summary.openInterventionPlans}</strong>
              <p>{summary.highRiskResidents} residents flagged high-risk</p>
            </article>

            <article className="admin-metric-card">
              <span className="admin-metric-label">Outreach posts</span>
              <strong>{summary.socialPostsThisMonth}</strong>
              <p>{summary.openIncidents} open incidents logged</p>
            </article>

            <article className="admin-metric-card admin-metric-gold">
              <span className="admin-metric-label">Giving this month</span>
              <strong>{formatMoney(summary.donationsThisMonth)}</strong>
              <p>{summary.recentDonations.length} gifts in feed</p>
            </article>
          </section>

          {/* ── Row 1: Donations + Occupancy ── */}
          <section className="admin-main-row">
            <SectionCard
              title="Recent donations"
              actions={
                <Link className="admin-view-link" to="/portal/donors">View all →</Link>
              }
            >
              {summary.recentDonations.length > 0 ? (
                <div className="admin-timeline" role="list">
                  {summary.recentDonations.slice(0, 5).map((donation, index) => (
                    <article className="admin-timeline-item" key={donation.donationId} role="listitem">
                      <div className={`admin-timeline-dot${index === 0 ? ' admin-timeline-dot-new' : ''}`} aria-hidden="true" />
                      <div className="admin-timeline-card">
                        <div className="admin-timeline-info">
                          <p className="admin-timeline-name">{donation.supporterName}</p>
                          <p className="admin-timeline-meta">{donation.donationType} · {formatDate(donation.donationDate)}</p>
                        </div>
                        <div className="admin-timeline-right">
                          {index === 0 && <span className="admin-pill admin-pill-new">New</span>}
                          <strong>{formatMoney(donation.amount)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No recent donations" message="Nothing in the feed yet." />
              )}
            </SectionCard>

            <SectionCard title="Safehouse occupancy">
              {allSafehouses.length > 0 ? (
                <>
                  <div className="admin-occupancy-list">
                    {pagedOccupancy.map((sh) => {
                      const pct = sh.capacityGirls
                        ? Math.min(100, Math.round((sh.currentOccupancy / sh.capacityGirls) * 100))
                        : 0;
                      const critical = pct >= 85;
                      const trend = safehousePerformance?.monthlyTrends.find(
                        (t) => safehousePerformance.safehouses.find((s) => s.safehouseId === t.safehouseId && s.safehouseName === sh.safehouseName)
                      );
                      const healthScore = trend?.monthlyTrend.at(-1)?.avgHealthScore;
                      return (
                        <div className="admin-occupancy-item" key={sh.safehouseName}>
                          <div className="admin-occupancy-head">
                            <strong>{sh.safehouseName}</strong>
                            <span className={critical ? 'admin-occupancy-critical' : ''}>
                              {sh.currentOccupancy}/{sh.capacityGirls}
                            </span>
                          </div>
                          <div className="admin-occupancy-bar">
                            <div className="admin-occupancy-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="admin-occupancy-note">
                            {pct}% capacity{critical ? ' — approaching limit' : ''}
                            {healthScore != null && healthScore > 0 ? ` · health ${healthScore.toFixed(1)}` : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <Pagination
                    page={occupancyPage}
                    totalPages={Math.ceil(allSafehouses.length / OCCUPANCY_PAGE_SIZE)}
                    totalItems={allSafehouses.length}
                    pageSize={OCCUPANCY_PAGE_SIZE}
                    onChange={setOccupancyPage}
                  />
                </>
              ) : (
                <EmptyState title="No data" message="Occupancy data unavailable." />
              )}
            </SectionCard>
          </section>

          {/* ── Row 2: Conferences + Snapshot ── */}
          <section className="page-grid two">
            <SectionCard
              title="Upcoming conferences"
              actions={
                <Link className="admin-view-link" to="/portal/caseload">View all →</Link>
              }
            >
              {allConferences.length > 0 ? (
                <>
                  <div className="donor-table-page" key={conferencePage}>
                    <DataTable
                      columns={['Resident', 'Date', 'Lead worker', 'Status']}
                      rows={pagedConferences.map((c) => [
                        c.residentCode,
                        formatDate(c.conferenceDate),
                        c.leadWorker,
                        <StatusBadge key={`cs-${c.id}`} value={c.status} />,
                      ])}
                      emptyMessage="No upcoming conferences."
                    />
                  </div>
                  <Pagination
                    page={conferencePage}
                    totalPages={Math.ceil(allConferences.length / CONFERENCE_PAGE_SIZE)}
                    totalItems={allConferences.length}
                    pageSize={CONFERENCE_PAGE_SIZE}
                    onChange={setConferencePage}
                  />
                </>
              ) : (
                <EmptyState title="Nothing scheduled" message="No upcoming case conferences." />
              )}
            </SectionCard>

            <SectionCard title="Operations snapshot">
              <div className="admin-snapshot-grid">
                <div className="admin-snapshot-stat">
                  <strong>{summary.progressSummary.progressNoted}</strong>
                  <span>Progress noted</span>
                </div>
                <div className="admin-snapshot-stat admin-snapshot-warn">
                  <strong>{summary.progressSummary.concernsFlagged}</strong>
                  <span>Concerns flagged</span>
                </div>
                <div className="admin-snapshot-stat">
                  <strong>{summary.progressSummary.referralsMade}</strong>
                  <span>Referrals made</span>
                </div>
                <div className="admin-snapshot-stat admin-snapshot-warn">
                  <strong>{summary.visitsNeedingFollowUp}</strong>
                  <span>Visits need follow-up</span>
                </div>
                <div className="admin-snapshot-stat">
                  <strong>{summary.safehouseCount}</strong>
                  <span>Active safehouses</span>
                </div>
                <div className={`admin-snapshot-stat${summary.openIncidents > 0 ? ' admin-snapshot-alert' : ''}`}>
                  <strong>{summary.openIncidents}</strong>
                  <span>Open incidents</span>
                </div>
              </div>
            </SectionCard>
          </section>

          {/* ── Row 3: Social posts (full width) ── */}
          <SectionCard title="Top social posts">
            <div className="donor-table-page" key={socialPage}>
              <DataTable
                columns={['Platform', 'Type', 'Referrals', 'Engagement']}
                rows={pagedSocial.map((post) => [
                  post.platform,
                  post.postType,
                  String(post.donationReferrals),
                  `${(post.engagementRate * 100).toFixed(1)}%`,
                ])}
                emptyMessage="No social analytics available."
              />
            </div>
            <Pagination
              page={socialPage}
              totalPages={Math.ceil(allSocialPosts.length / SOCIAL_PAGE_SIZE)}
              totalItems={allSocialPosts.length}
              pageSize={SOCIAL_PAGE_SIZE}
              onChange={setSocialPage}
            />
          </SectionCard>
        </>
      ) : (
        <EmptyState title="No data" message="The dashboard returned no data yet." />
      )}
    </div>
  );
}
