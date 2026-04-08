import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type {
  CounselingRiskSummary,
  DonationTrends,
  IncidentReport,
  IncidentReportRequest,
  OutreachPerformanceSummary,
  ReintegrationRiskSummary,
  ReintegrationSummary,
  Resident,
  ResidentOutcomeSummary,
  Safehouse,
  SafehousePerformanceSummary,
  SocialPostAdvisorPrediction,
  SocialPostAdvisorRequest,
  SafehouseRequest,
  SocialAnalytics,
  TrendDeploymentSummary,
} from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { chartWidthClass } from '../../lib/charts';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';

function createSafehouseForm(): SafehouseRequest {
  return {
    code: '',
    name: '',
    region: '',
    city: '',
    province: '',
    country: 'Philippines',
    openDate: new Date().toISOString().slice(0, 10),
    status: 'Active',
    capacityGirls: 24,
    capacityStaff: 8,
    currentOccupancy: 0,
    notes: '',
  };
}

function createIncidentForm(residentId?: number, safehouseId?: number): IncidentReportRequest {
  return {
    residentId: residentId ?? 1,
    safehouseId: safehouseId ?? 1,
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentType: 'Safety',
    severity: 'Medium',
    description: '',
    responseTaken: '',
    resolved: false,
    resolutionDate: '',
    reportedBy: '',
    followUpRequired: true,
  };
}

function createSocialAdvisorForm(): SocialPostAdvisorRequest {
  return {
    platform: 'Facebook',
    postType: 'Story',
    mediaType: 'Video',
    sentimentTone: 'Hopeful',
    postHour: 19,
    numHashtags: 4,
    hasCallToAction: true,
    featuresResidentStory: true,
    isBoosted: false,
    boostBudgetPhp: 0,
  };
}

export function ReportsAnalyticsPage() {
  const { user } = useAuth();
  const [donationTrends, setDonationTrends] = useState<DonationTrends | null>(null);
  const [residentOutcomes, setResidentOutcomes] = useState<ResidentOutcomeSummary | null>(null);
  const [safehousePerformance, setSafehousePerformance] = useState<SafehousePerformanceSummary | null>(null);
  const [reintegrationSummary, setReintegrationSummary] = useState<ReintegrationSummary | null>(null);
  const [reintegrationRiskSummary, setReintegrationRiskSummary] = useState<ReintegrationRiskSummary | null>(null);
  const [outreachPerformance, setOutreachPerformance] = useState<OutreachPerformanceSummary | null>(null);
  const [socialAnalytics, setSocialAnalytics] = useState<SocialAnalytics | null>(null);
  const [counselingRiskSummary, setCounselingRiskSummary] = useState<CounselingRiskSummary | null>(null);
  const [trendDeployments, setTrendDeployments] = useState<TrendDeploymentSummary | null>(null);
  const [socialAdvisorForm, setSocialAdvisorForm] = useState<SocialPostAdvisorRequest>(createSocialAdvisorForm());
  const [socialAdvisorPrediction, setSocialAdvisorPrediction] = useState<SocialPostAdvisorPrediction | null>(null);
  const [socialAdvisorLoading, setSocialAdvisorLoading] = useState(false);
  const [socialPlatformFilter, setSocialPlatformFilter] = useState('All');
  const [socialTypeFilter, setSocialTypeFilter] = useState('All');
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [safehouseStatusFilter, setSafehouseStatusFilter] = useState('All');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('All');
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [editingSafehouseId, setEditingSafehouseId] = useState<number | null>(null);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [safehouseForm, setSafehouseForm] = useState<SafehouseRequest>(createSafehouseForm());
  const [incidentForm, setIncidentForm] = useState<IncidentReportRequest>(createIncidentForm());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const deferredIncidentSearch = useDeferredValue(incidentSearch);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadAnalytics = async () => {
    if (!user) return;

    // Reports come from several purpose-specific endpoints instead of one giant payload.
    // That keeps the backend query logic easier to understand and lets each report evolve
    // without forcing every other module to change at the same time.
    setLoading(true);
    setError(null);

    try {
      const [trendData, outcomeData, safehouseReport, reintegrationData, reintegrationRiskData, outreachData, socialData, counselingRiskData, trendDeploymentData, safehouseData, incidentData, residentData] = await Promise.all([
        api.donationTrends(),
        api.residentOutcomes(),
        api.safehousePerformance(),
        api.reintegrationSummary(),
        api.reintegrationRiskSummary(12),
        api.outreachPerformance(),
        api.socialAnalytics(),
        api.counselingRiskSummary(12),
        api.trendDeployments(),
        api.safehouses(),
        api.incidents(),
        api.residents(),
      ]);
      setDonationTrends(trendData);
      setResidentOutcomes(outcomeData);
      setSafehousePerformance(safehouseReport);
      setReintegrationSummary(reintegrationData);
      setReintegrationRiskSummary(reintegrationRiskData);
      setOutreachPerformance(outreachData);
      setSocialAnalytics(socialData);
      setCounselingRiskSummary(counselingRiskData);
      setTrendDeployments(trendDeploymentData);
      setSafehouses(safehouseData);
      setIncidents(incidentData);
      setResidents(residentData);
      setSelectedIncidentId((current) => current ?? incidentData[0]?.id ?? null);
      setSafehouseForm((current) => current.code ? current : createSafehouseForm());
      setIncidentForm((current) => current.residentId > 0 ? current : createIncidentForm(residentData[0]?.id, safehouseData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [user]);

  if (!user) return null;

  const performanceRows = safehousePerformance?.safehouses ?? [];
  const totalRaised = donationTrends?.monthlyTotals.reduce((sum, point) => sum + point.totalAmount, 0) ?? 0;
  const totalReferrals = outreachPerformance?.platformSummaries.reduce((sum, item) => sum + item.totalDonationReferrals, 0) ?? 0;
  const highRiskResidents = residentOutcomes?.followUpBurden.highRiskResidents ?? 0;
  const openIncidentCount = incidents.filter((incident) => !incident.resolved).length;
  const filteredSafehouses = safehouses.filter((safehouse) => safehouseStatusFilter === 'All' || safehouse.status === safehouseStatusFilter);
  const normalizedIncidentSearch = normalizeText(deferredIncidentSearch);
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      !normalizedIncidentSearch ||
      normalizeText(incident.residentCode).includes(normalizedIncidentSearch) ||
      normalizeText(incident.safehouseName).includes(normalizedIncidentSearch) ||
      normalizeText(incident.incidentType).includes(normalizedIncidentSearch) ||
      normalizeText(incident.reportedBy).includes(normalizedIncidentSearch);
    const matchesSeverity = incidentSeverityFilter === 'All' || incident.severity === incidentSeverityFilter;
    return matchesSearch && matchesSeverity;
  });
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0] ?? null;

  const resetSafehouseForm = () => {
    setEditingSafehouseId(null);
    setSafehouseForm(createSafehouseForm());
  };

  const resetIncidentForm = () => {
    setEditingIncidentId(null);
    setIncidentForm(createIncidentForm(residents[0]?.id, safehouses[0]?.id));
  };

  const handleSafehouseSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting('safehouse');
    setFeedback(null);

    try {
      const payload = { ...safehouseForm, notes: safehouseForm.notes || null };
      if (editingSafehouseId) {
        await api.updateSafehouse(editingSafehouseId, payload);
        setFeedback({ tone: 'success', message: 'Safehouse updated.' });
      } else {
        await api.createSafehouse(payload);
        setFeedback({ tone: 'success', message: 'Safehouse created.' });
      }

      resetSafehouseForm();
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Safehouse save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleIncidentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting('incident');
    setFeedback(null);

    try {
      const payload = {
        ...incidentForm,
        resolutionDate: incidentForm.resolutionDate || null,
      };
      if (editingIncidentId) {
        await api.updateIncident(editingIncidentId, payload);
        setFeedback({ tone: 'success', message: 'Incident updated.' });
      } else {
        await api.createIncident(payload);
        setFeedback({ tone: 'success', message: 'Incident created.' });
      }

      resetIncidentForm();
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Incident save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const deleteSafehouse = async (id: number) => {
    if (!user || !window.confirm('Delete this safehouse? This action requires confirmation.')) return;
    try {
      await api.deleteSafehouse(id);
      setFeedback({ tone: 'success', message: 'Safehouse deleted.' });
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Safehouse delete failed.' });
    }
  };

  const deleteIncident = async (id: number) => {
    if (!user || !window.confirm('Delete this incident? This action requires confirmation.')) return;
    try {
      await api.deleteIncident(id);
      setFeedback({ tone: 'success', message: 'Incident deleted.' });
      if (selectedIncidentId === id) setSelectedIncidentId(null);
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Incident delete failed.' });
    }
  };

  const runSocialAdvisor = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSocialAdvisorLoading(true);
    setFeedback(null);
    try {
      const payload = {
        ...socialAdvisorForm,
        postHour: Math.max(0, Math.min(23, Number(socialAdvisorForm.postHour))),
        numHashtags: Math.max(0, Number(socialAdvisorForm.numHashtags)),
        boostBudgetPhp: Math.max(0, Number(socialAdvisorForm.boostBudgetPhp)),
      };
      const prediction = await api.socialPostAdvisor(payload);
      setSocialAdvisorPrediction(prediction);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Post advisor request failed.' });
    } finally {
      setSocialAdvisorLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Decision support</span>
          <h1>Reports & analytics</h1>
          <p>Review donation trends, resident outcomes, safehouse performance, reintegration progress, and outreach results.</p>
        </div>
      </div>

      <section className="page-grid four">
        <MetricCard label="Total giving tracked" value={formatMoney(totalRaised)} detail="Combined donation totals across the reporting period." accent />
        <MetricCard label="High-risk residents" value={String(highRiskResidents)} detail="Residents currently flagged high or critical risk." />
        <MetricCard label="Open incidents" value={String(openIncidentCount)} detail="Operational incidents still unresolved." />
        <MetricCard label="Outreach referrals" value={String(totalReferrals)} detail="Donation referrals attributed to social content." />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading analytics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAnalytics} />
      ) : (
        <>
          <section className="page-grid one" id="deep-trend-scorecards">
            <SectionCard title="Deep trend deployment scorecards" subtitle="Operational bridge for all six new exploratory/explanatory trend pipelines.">
              <DataTable
                columns={['Pipeline', 'Primary metric', 'Current value', 'Endpoint', 'Recommendation']}
                rows={(trendDeployments?.rows ?? []).map((row) => [
                  row.pipelineKey,
                  row.primaryMetric,
                  Number.isFinite(row.currentValue) ? row.currentValue.toFixed(4) : '0.0000',
                  row.endpointPath,
                  row.recommendation,
                ])}
                emptyMessage="Trend deployment rows are not available."
                caption="Trend pipeline deployment bridge"
              />
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard title="Donation trends" subtitle="Monthly giving totals, campaign activity, and contribution mix">
              {donationTrends ? (
                <>
                  <div className="chart-list">
                    {donationTrends.monthlyTotals.map((point) => (
                      <div className="chart-row" key={point.periodLabel}>
                        <span>{point.periodLabel}</span>
                        <div className="chart-bar">
                          <div className={chartWidthClass((point.totalAmount / Math.max(totalRaised, 1)) * 100)} />
                        </div>
                        <strong>{formatMoney(point.totalAmount)}</strong>
                      </div>
                    ))}
                  </div>
                  <DataTable
                    columns={['Type', 'Amount', 'Count']}
                    rows={donationTrends.contributionMix.map((item) => [
                      item.donationType,
                      formatMoney(item.totalAmount),
                      item.donationCount,
                    ])}
                    emptyMessage="No donation mix data available."
                    caption="Contribution mix by type"
                  />
                </>
              ) : (
                <EmptyState title="No donation trend data" message="No donation trend data was returned." />
              )}
            </SectionCard>

            <SectionCard title="Resident outcomes" subtitle="Progress and follow-up indicators from case workflows">
              {residentOutcomes ? (
                <div className="page-grid two compact">
                  <MetricCard
                    label="Plans in progress"
                    value={String(residentOutcomes.interventionPlanStatuses.find((item) => item.label === 'In Progress')?.count ?? 0)}
                    detail="Intervention plans currently underway."
                    accent
                  />
                  <MetricCard
                    label="Visits needing follow-up"
                    value={String(residentOutcomes.followUpBurden.visitsNeedingFollowUp)}
                    detail="Visit records that still need action."
                  />
                  <MetricCard
                    label="Progress noted"
                    value={String(residentOutcomes.processRecordingSummary.progressNoted)}
                    detail="Process recordings marked as progress."
                  />
                  <MetricCard
                    label="Referrals made"
                    value={String(residentOutcomes.processRecordingSummary.referralsMade)}
                    detail="Session escalations or referrals."
                  />
                </div>
              ) : (
                <EmptyState title="No resident outcomes" message="No resident outcomes data was returned." />
              )}
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard title="Safehouse performance" subtitle="Occupancy, incidents, residents, and allocation totals by location">
              <DataTable
                columns={['Safehouse', 'Occupancy', 'Residents', 'Incidents', 'Allocated']}
                rows={performanceRows.map((safehouse) => [
                  safehouse.safehouseName,
                  `${safehouse.currentOccupancy}/${safehouse.capacityGirls}`,
                  safehouse.residentCount,
                  safehouse.incidentCount,
                  formatMoney(safehouse.donationAllocationTotal),
                ])}
                emptyMessage="No safehouse performance data is available."
                caption="Safehouse performance summary"
              />
              {safehousePerformance?.monthlyTrends && safehousePerformance.monthlyTrends.length > 0 ? (
                <div>
                  <p className="chart-section-label">Monthly health score trend</p>
                  {safehousePerformance.monthlyTrends.map((row) => {
                    const maxHealth = Math.max(...row.monthlyTrend.map((p) => p.avgHealthScore), 1);
                    return (
                      <div key={row.safehouseId} className="chart-safehouse-block">
                        <p className="chart-safehouse-label">{row.safehouseName}</p>
                        <div className="chart-list">
                          {row.monthlyTrend.map((point) => (
                            <div className="chart-row" key={point.monthStart}>
                              <span>{point.monthStart.slice(0, 7)}</span>
                              <div className="chart-bar">
                                <div className={chartWidthClass((point.avgHealthScore / maxHealth) * 100)} />
                              </div>
                              <strong>{point.avgHealthScore.toFixed(1)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Reintegration summary" subtitle="Current reintegration status and pathway mix">
              {reintegrationSummary ? (
                <>
                  <DataTable
                    columns={['Status', 'Residents']}
                    rows={reintegrationSummary.reintegrationStatuses.map((item) => [item.label, item.count])}
                    emptyMessage="No reintegration summary data is available."
                    caption="Reintegration statuses"
                  />
                  <DataTable
                    columns={['Resident', 'Risk score', 'Positive trajectory', 'Action']}
                    rows={(reintegrationRiskSummary?.topRiskResidents ?? []).map((item) => [
                      item.residentCode,
                      `${(item.riskScore * 100).toFixed(1)}%`,
                      `${(item.positiveProbability * 100).toFixed(1)}%`,
                      item.recommendedAction,
                    ])}
                    emptyMessage="No reintegration risk data is available."
                    caption="ML reintegration risk watchlist"
                  />
                </>
              ) : (
                <EmptyState title="No reintegration data" message="No reintegration summary data was returned." />
              )}
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Social media analytics"
              subtitle="Post-level performance across platforms"
              actions={
                <div className="filter-row">
                  <select
                    aria-label="Filter by platform"
                    className="inline-select"
                    value={socialPlatformFilter}
                    onChange={(event) => setSocialPlatformFilter(event.target.value)}
                  >
                    <option>All</option>
                    {[...new Set(socialAnalytics?.posts.map((p) => p.platform) ?? [])].map((pl) => (
                      <option key={pl}>{pl}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by post type"
                    className="inline-select"
                    value={socialTypeFilter}
                    onChange={(event) => setSocialTypeFilter(event.target.value)}
                  >
                    <option>All</option>
                    {[...new Set(socialAnalytics?.posts.map((p) => p.postType) ?? [])].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              }
            >
              {socialAnalytics ? (
                <>
                  <section className="page-grid four compact">
                    <MetricCard label="Total impressions" value={socialAnalytics.totals.totalImpressions.toLocaleString()} detail="Cumulative impressions across all posts." />
                    <MetricCard label="Total reach" value={socialAnalytics.totals.totalReach.toLocaleString()} detail="Unique accounts reached." />
                    <MetricCard label="Donation referrals" value={String(socialAnalytics.totals.totalDonationReferrals)} detail="Clicks attributed to donations." accent />
                    <MetricCard label="Avg engagement" value={`${(socialAnalytics.totals.avgEngagementRate * 100).toFixed(1)}%`} detail="Average engagement rate across posts." />
                  </section>
                  <DataTable
                    columns={['Platform', 'Type', 'Date', 'Impressions', 'Reach', 'Engagement', 'CTR', 'Referrals']}
                    rows={(socialAnalytics.posts
                      .filter((p) => (socialPlatformFilter === 'All' || p.platform === socialPlatformFilter) && (socialTypeFilter === 'All' || p.postType === socialTypeFilter)))
                      .map((post) => [
                        post.platform,
                        post.postType,
                        post.createdAtUtc.slice(0, 10),
                        post.impressions.toLocaleString(),
                        post.reach.toLocaleString(),
                        `${(post.engagementRate * 100).toFixed(1)}%`,
                        post.clickThroughs.toLocaleString(),
                        post.donationReferrals,
                      ])}
                    emptyMessage="No posts match the current filters."
                    caption="Social media post-level performance"
                  />
                  <form className="stack-form" onSubmit={runSocialAdvisor}>
                    <FormSection title="Post advisor (deployed prediction)">
                      <FormGrid>
                        <label><span>Platform</span><input value={socialAdvisorForm.platform} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, platform: event.target.value })} required /></label>
                        <label><span>Post type</span><input value={socialAdvisorForm.postType} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, postType: event.target.value })} required /></label>
                        <label><span>Media type</span><input value={socialAdvisorForm.mediaType} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, mediaType: event.target.value })} required /></label>
                        <label><span>Sentiment</span><input value={socialAdvisorForm.sentimentTone} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, sentimentTone: event.target.value })} required /></label>
                        <label><span>Post hour</span><input type="number" min="0" max="23" value={socialAdvisorForm.postHour} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, postHour: Number(event.target.value) })} required /></label>
                        <label><span>Hashtags</span><input type="number" min="0" value={socialAdvisorForm.numHashtags} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, numHashtags: Number(event.target.value) })} required /></label>
                        <label><span>Boost budget (PHP)</span><input type="number" min="0" value={socialAdvisorForm.boostBudgetPhp} onChange={(event) => setSocialAdvisorForm({ ...socialAdvisorForm, boostBudgetPhp: Number(event.target.value) })} /></label>
                      </FormGrid>
                      <div className="check-grid">
                        <CheckboxField label="Has call to action" checked={socialAdvisorForm.hasCallToAction} onChange={(checked) => setSocialAdvisorForm({ ...socialAdvisorForm, hasCallToAction: checked })} />
                        <CheckboxField label="Features resident story" checked={socialAdvisorForm.featuresResidentStory} onChange={(checked) => setSocialAdvisorForm({ ...socialAdvisorForm, featuresResidentStory: checked })} />
                        <CheckboxField label="Is boosted" checked={socialAdvisorForm.isBoosted} onChange={(checked) => setSocialAdvisorForm({ ...socialAdvisorForm, isBoosted: checked })} />
                      </div>
                    </FormSection>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" disabled={socialAdvisorLoading}>
                        {socialAdvisorLoading ? 'Scoring...' : 'Predict conversion value'}
                      </button>
                    </div>
                  </form>
                  {socialAdvisorPrediction ? (
                    <>
                      <section className="page-grid two compact">
                        <MetricCard label="Predicted donation value" value={formatMoney(socialAdvisorPrediction.predictedDonationValuePhp)} detail="Estimated conversion value for the draft post." accent />
                        <MetricCard label="Historical baseline" value={formatMoney(socialAdvisorPrediction.baselineDonationValuePhp)} detail="Average donation value across historical posts." />
                      </section>
                      <DataTable
                        columns={['Feature', 'Effect']}
                        rows={socialAdvisorPrediction.topContributions.map((item) => [
                          item.feature,
                          formatMoney(item.effectAmountPhp),
                        ])}
                        emptyMessage="No contribution details available."
                        caption="Top feature effects"
                      />
                      <p className="muted-inline">{socialAdvisorPrediction.notes}</p>
                    </>
                  ) : null}
                </>
              ) : (
                <EmptyState title="No social analytics data" message="No social analytics data was returned." />
              )}
            </SectionCard>

            <SectionCard
              title="Operational watchlist"
              subtitle="Maintain safehouse and incident records used in internal reporting."
              actions={
                <div className="filter-row">
                  <select
                    aria-label="Filter safehouse status"
                    className="inline-select"
                    value={safehouseStatusFilter}
                    onChange={(event) => setSafehouseStatusFilter(event.target.value)}
                  >
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <input
                    aria-label="Search incidents"
                    className="inline-search"
                    placeholder="Search incidents..."
                    value={incidentSearch}
                    onChange={(event) => setIncidentSearch(event.target.value)}
                  />
                  <select
                    aria-label="Filter incident severity"
                    className="inline-select"
                    value={incidentSeverityFilter}
                    onChange={(event) => setIncidentSeverityFilter(event.target.value)}
                  >
                    <option>All</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              }
            >
              <DataTable
                columns={['Safehouse', 'Status', 'Occupancy', 'Actions']}
                rows={filteredSafehouses.map((safehouse) => [
                  safehouse.name,
                  <StatusBadge key={`sh-status-${safehouse.id}`} value={safehouse.status} />,
                  `${safehouse.currentOccupancy}/${safehouse.capacityGirls}`,
                  <div className="table-actions" key={`safehouse-actions-${safehouse.id}`}>
                    {isAdmin ? (
                      <>
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setEditingSafehouseId(safehouse.id);
                            setSafehouseForm({
                              code: safehouse.code,
                              name: safehouse.name,
                              region: safehouse.region,
                              city: safehouse.city,
                              province: safehouse.province,
                              country: safehouse.country,
                              openDate: safehouse.openDate,
                              status: safehouse.status,
                              capacityGirls: safehouse.capacityGirls,
                              capacityStaff: safehouse.capacityStaff,
                              currentOccupancy: safehouse.currentOccupancy,
                              notes: safehouse.notes ?? '',
                            });
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button className="ghost-button danger-button" onClick={() => void deleteSafehouse(safehouse.id)} type="button">Delete</button>
                      </>
                    ) : (
                      <span className="home-muted">Read only</span>
                    )}
                  </div>,
                ])}
                emptyMessage="No safehouses match the current filter."
                caption="Safehouse records"
              />
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard title="Counseling escalation risk" subtitle="Session-level concern probability for supervisor triage.">
              <section className="page-grid four compact">
                <MetricCard label="Evaluated sessions" value={String(counselingRiskSummary?.evaluatedSessions ?? 0)} detail="Sessions scored with deployed concern model." />
                <MetricCard label="High risk" value={String(counselingRiskSummary?.highRiskCount ?? 0)} detail="Immediate supervisor review recommended." accent />
                <MetricCard label="Medium risk" value={String(counselingRiskSummary?.mediumRiskCount ?? 0)} detail="Review in regular cadence." />
                <MetricCard label="Low risk" value={String(counselingRiskSummary?.lowRiskCount ?? 0)} detail="Monitor in routine check-ins." />
              </section>
              <DataTable
                columns={['Resident', 'Date', 'Session', 'Concern probability', 'Tier', 'Primary factor']}
                rows={(counselingRiskSummary?.topRiskSessions ?? []).map((item) => [
                  item.residentCode,
                  item.sessionDate,
                  item.sessionType,
                  `${(item.concernProbability * 100).toFixed(1)}%`,
                  item.riskTier,
                  item.primaryFactor,
                ])}
                emptyMessage="No counseling risk rows were returned."
                caption="Counseling risk watchlist"
              />
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard title="Incident watchlist" subtitle="Use the detail panel to review incident context and follow-up needs.">
              <DataTable
                columns={['Resident', 'Safehouse', 'Type', 'Severity', 'Actions']}
                rows={filteredIncidents.map((incident) => [
                  <button className="table-link-button" key={`incident-${incident.id}`} onClick={() => setSelectedIncidentId(incident.id)} type="button">
                    {incident.residentCode}
                  </button>,
                  incident.safehouseName,
                  incident.incidentType,
                  <StatusBadge key={`incident-sev-${incident.id}`} value={incident.severity} />,
                  <div className="table-actions" key={`incident-actions-${incident.id}`}>
                    <button className="ghost-button" onClick={() => setSelectedIncidentId(incident.id)} type="button">View</button>
                    {isAdmin ? (
                      <>
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setEditingIncidentId(incident.id);
                            setIncidentForm({
                              residentId: incident.residentId,
                              safehouseId: incident.safehouseId,
                              incidentDate: incident.incidentDate,
                              incidentType: incident.incidentType,
                              severity: incident.severity,
                              description: incident.description,
                              responseTaken: incident.responseTaken,
                              resolved: incident.resolved,
                              resolutionDate: incident.resolutionDate ?? '',
                              reportedBy: incident.reportedBy,
                              followUpRequired: incident.followUpRequired,
                            });
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button className="ghost-button danger-button" onClick={() => void deleteIncident(incident.id)} type="button">Delete</button>
                      </>
                    ) : null}
                  </div>,
                ])}
                emptyMessage="No incidents match the current filters."
                caption="Incident watchlist"
              />
            </SectionCard>

            <DetailPanel title={selectedIncident ? `${selectedIncident.residentCode} incident` : 'Incident details'} subtitle="Incident details help staff explain what happened, how it was handled, and what remains open.">
              {selectedIncident ? (
                <DetailList
                  items={[
                    { label: 'Date', value: formatDate(selectedIncident.incidentDate) },
                    { label: 'Type', value: selectedIncident.incidentType },
                    { label: 'Severity', value: selectedIncident.severity },
                    { label: 'Safehouse', value: selectedIncident.safehouseName },
                    { label: 'Reported by', value: selectedIncident.reportedBy },
                    { label: 'Description', value: selectedIncident.description },
                    { label: 'Response taken', value: selectedIncident.responseTaken },
                    { label: 'Follow-up required', value: selectedIncident.followUpRequired ? 'Yes' : 'No' },
                  ]}
                />
              ) : (
                <EmptyState title="No incident selected" message="Choose an incident from the table to inspect its details." />
              )}
            </DetailPanel>
          </section>

          {isAdmin ? (
            <>
              <SectionCard
                title={editingSafehouseId ? 'Edit safehouse' : 'Create safehouse'}
                subtitle="Maintain the safehouse records used for occupancy, incident, and allocation reporting."
                actions={editingSafehouseId ? <button className="ghost-button" onClick={resetSafehouseForm} type="button">Cancel edit</button> : null}
              >
                <form className="stack-form" onSubmit={handleSafehouseSubmit}>
                  <FormSection title="Safehouse details">
                    <FormGrid>
                      <label htmlFor="sh-code"><span>Code</span><input id="sh-code" value={safehouseForm.code} onChange={(event) => setSafehouseForm({ ...safehouseForm, code: event.target.value })} required /></label>
                      <label htmlFor="sh-name"><span>Name</span><input id="sh-name" value={safehouseForm.name} onChange={(event) => setSafehouseForm({ ...safehouseForm, name: event.target.value })} required /></label>
                      <label htmlFor="sh-region"><span>Region</span><input id="sh-region" value={safehouseForm.region} onChange={(event) => setSafehouseForm({ ...safehouseForm, region: event.target.value })} required /></label>
                      <label htmlFor="sh-city"><span>City</span><input id="sh-city" value={safehouseForm.city} onChange={(event) => setSafehouseForm({ ...safehouseForm, city: event.target.value })} required /></label>
                      <label htmlFor="sh-province"><span>Province</span><input id="sh-province" value={safehouseForm.province} onChange={(event) => setSafehouseForm({ ...safehouseForm, province: event.target.value })} required /></label>
                      <label htmlFor="sh-country"><span>Country</span><input id="sh-country" value={safehouseForm.country} onChange={(event) => setSafehouseForm({ ...safehouseForm, country: event.target.value })} required /></label>
                      <label htmlFor="sh-open-date"><span>Open date</span><input id="sh-open-date" type="date" value={safehouseForm.openDate} onChange={(event) => setSafehouseForm({ ...safehouseForm, openDate: event.target.value })} required /></label>
                      <label htmlFor="sh-status"><span>Status</span><input id="sh-status" value={safehouseForm.status} onChange={(event) => setSafehouseForm({ ...safehouseForm, status: event.target.value })} required /></label>
                      <label htmlFor="sh-capacity-girls"><span>Capacity (girls)</span><input id="sh-capacity-girls" type="number" min="0" value={safehouseForm.capacityGirls} onChange={(event) => setSafehouseForm({ ...safehouseForm, capacityGirls: Number(event.target.value) })} required /></label>
                      <label htmlFor="sh-capacity-staff"><span>Capacity (staff)</span><input id="sh-capacity-staff" type="number" min="0" value={safehouseForm.capacityStaff} onChange={(event) => setSafehouseForm({ ...safehouseForm, capacityStaff: Number(event.target.value) })} required /></label>
                      <label htmlFor="sh-occupancy"><span>Current occupancy</span><input id="sh-occupancy" type="number" min="0" value={safehouseForm.currentOccupancy} onChange={(event) => setSafehouseForm({ ...safehouseForm, currentOccupancy: Number(event.target.value) })} required /></label>
                    </FormGrid>
                  </FormSection>
                  <label htmlFor="sh-notes"><span>Notes</span><textarea id="sh-notes" value={safehouseForm.notes ?? ''} onChange={(event) => setSafehouseForm({ ...safehouseForm, notes: event.target.value })} rows={3} /></label>
                  <div className="form-actions">
                    <button className="primary-button" disabled={submitting === 'safehouse'} type="submit">
                      {submitting === 'safehouse' ? 'Saving...' : editingSafehouseId ? 'Update safehouse' : 'Create safehouse'}
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                title={editingIncidentId ? 'Edit incident' : 'Create incident'}
                subtitle="Maintain incident records used in the watchlist and safehouse performance reporting."
                actions={editingIncidentId ? <button className="ghost-button" onClick={resetIncidentForm} type="button">Cancel edit</button> : null}
              >
                <form className="stack-form" onSubmit={handleIncidentSubmit}>
                  <FormSection title="Incident details">
                    <FormGrid>
                      <label htmlFor="inc-resident">
                        <span>Resident</span>
                        <select id="inc-resident" value={incidentForm.residentId} onChange={(event) => setIncidentForm({ ...incidentForm, residentId: Number(event.target.value) })}>
                          {residents.map((resident) => (
                            <option key={resident.id} value={resident.id}>
                              {resident.caseControlNumber}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label htmlFor="inc-safehouse">
                        <span>Safehouse</span>
                        <select id="inc-safehouse" value={incidentForm.safehouseId} onChange={(event) => setIncidentForm({ ...incidentForm, safehouseId: Number(event.target.value) })}>
                          {safehouses.map((safehouse) => (
                            <option key={safehouse.id} value={safehouse.id}>
                              {safehouse.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label htmlFor="inc-date"><span>Incident date</span><input id="inc-date" type="date" value={incidentForm.incidentDate} onChange={(event) => setIncidentForm({ ...incidentForm, incidentDate: event.target.value })} required /></label>
                      <label htmlFor="inc-type"><span>Incident type</span><input id="inc-type" value={incidentForm.incidentType} onChange={(event) => setIncidentForm({ ...incidentForm, incidentType: event.target.value })} required /></label>
                      <label htmlFor="inc-severity"><span>Severity</span><input id="inc-severity" value={incidentForm.severity} onChange={(event) => setIncidentForm({ ...incidentForm, severity: event.target.value })} required /></label>
                      <label htmlFor="inc-reported-by"><span>Reported by</span><input id="inc-reported-by" value={incidentForm.reportedBy} onChange={(event) => setIncidentForm({ ...incidentForm, reportedBy: event.target.value })} required /></label>
                    </FormGrid>
                  </FormSection>
                  <label htmlFor="inc-description"><span>Description</span><textarea id="inc-description" value={incidentForm.description} onChange={(event) => setIncidentForm({ ...incidentForm, description: event.target.value })} rows={3} required /></label>
                  <label htmlFor="inc-response"><span>Response taken</span><textarea id="inc-response" value={incidentForm.responseTaken} onChange={(event) => setIncidentForm({ ...incidentForm, responseTaken: event.target.value })} rows={3} required /></label>
                  <div className="check-grid">
                    <CheckboxField label="Resolved" checked={incidentForm.resolved} onChange={(checked) => setIncidentForm({ ...incidentForm, resolved: checked })} />
                    <CheckboxField label="Follow-up required" checked={incidentForm.followUpRequired} onChange={(checked) => setIncidentForm({ ...incidentForm, followUpRequired: checked })} />
                  </div>
                  <label htmlFor="inc-resolution-date"><span>Resolution date</span><input id="inc-resolution-date" type="date" value={incidentForm.resolutionDate ?? ''} onChange={(event) => setIncidentForm({ ...incidentForm, resolutionDate: event.target.value })} /></label>
                  <div className="form-actions">
                    <button className="primary-button" disabled={submitting === 'incident'} type="submit">
                      {submitting === 'incident' ? 'Saving...' : editingIncidentId ? 'Update incident' : 'Create incident'}
                    </button>
                  </div>
                </form>
              </SectionCard>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
