import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { useAuth } from '../../hooks/useAuth';
import { chartWidthClass } from '../../lib/charts';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';
import { combineUnavailableSections, describeUnavailableSection, getRequestErrorMessage } from '../../lib/loadMessages';
import {
  MOCK_COUNSELING_RISK_SUMMARY,
  MOCK_DONATION_TRENDS,
  MOCK_OUTREACH_PERFORMANCE,
  MOCK_REINTEGRATION_SUMMARY,
  MOCK_RESIDENT_OUTCOMES,
  MOCK_SOCIAL_ANALYTICS,
} from '../../lib/portalMockData';

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

const REPORTS = [
  { key: 'donation-trends', label: 'Donation Trends' },
  { key: 'resident-outcomes', label: 'Resident Outcomes' },
  { key: 'safehouse-performance', label: 'Safehouse Performance' },
  { key: 'reintegration', label: 'Reintegration Summary' },
  { key: 'social-analytics', label: 'Social Media Analytics' },
  { key: 'safehouse-records', label: 'Safehouse Records' },
  { key: 'counseling-risk', label: 'Counseling Escalation Risk' },
  { key: 'incident-watchlist', label: 'Incident Watchlist' },
  { key: 'trend-deployments', label: 'Trend Deployments' },
];

const DEFAULT_TABLE_PAGE_SIZE = 6;
const LARGE_TABLE_PAGE_SIZE = 8;
const TREND_BARS_PAGE_SIZE = 12;
// Keep the partial-load warnings in the same order as the Promise.allSettled() calls below.
const REPORT_SECTION_FALLBACKS = [
  ['Donation trends', 'Donation trend analytics are unavailable.'],
  ['Resident outcomes', 'Resident outcome analytics are unavailable.'],
  ['Safehouse performance', 'Safehouse performance analytics are unavailable.'],
  ['Reintegration summary', 'Reintegration analytics are unavailable.'],
  ['Reintegration risk', 'Reintegration risk scoring is unavailable.'],
  ['Outreach performance', 'Outreach analytics are unavailable.'],
  ['Social analytics', 'Social analytics are unavailable.'],
  ['Counseling risk', 'Counseling risk scoring is unavailable.'],
  ['Trend deployments', 'Trend deployment scorecards are unavailable.'],
  ['Safehouse records', 'Safehouse records are unavailable.'],
  ['Incident watchlist', 'Incident records are unavailable.'],
  ['Resident directory', 'Resident directory is unavailable.'],
] as const;

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

function ReportFilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="report-filter-field" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ReportTableSection({
  title,
  description,
  countLabel,
  children,
}: {
  title: string;
  description: string;
  countLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="report-table-section">
      <div className="report-table-header">
        <div className="report-table-copy">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {countLabel ? <span className="report-table-meta">{countLabel}</span> : null}
      </div>
      {children}
    </section>
  );
}

function AnalyticsModal({
  title,
  subtitle,
  onClose,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="modal-backdrop analytics-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal-surface analytics-modal${className ? ` ${className}` : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="analytics-modal-header">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="analytics-modal-body">{children}</div>
      </div>
    </div>
  );
}

function createSafehouseFormFromRecord(safehouse: Safehouse): SafehouseRequest {
  return {
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
  };
}

function createIncidentFormFromRecord(incident: IncidentReport): IncidentReportRequest {
  return {
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
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [safehouseStatusFilter, setSafehouseStatusFilter] = useState('All');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('All');
  const [viewingSafehouseId, setViewingSafehouseId] = useState<number | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [editingSafehouseId, setEditingSafehouseId] = useState<number | null>(null);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [safehouseForm, setSafehouseForm] = useState<SafehouseRequest>(createSafehouseForm());
  const [incidentForm, setIncidentForm] = useState<IncidentReportRequest>(createIncidentForm());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<string>('donation-trends');
  const [safehousePerformancePage, setSafehousePerformancePage] = useState(1);
  const [selectedTrendSafehouseId, setSelectedTrendSafehouseId] = useState<number | null>(null);
  const [selectedTrendMonthPage, setSelectedTrendMonthPage] = useState(1);
  const [reintegrationRiskPage, setReintegrationRiskPage] = useState(1);
  const [socialPostsPage, setSocialPostsPage] = useState(1);
  const [safehouseRecordsPage, setSafehouseRecordsPage] = useState(1);
  const [counselingRiskPage, setCounselingRiskPage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);
  const [trendDeploymentsPage, setTrendDeploymentsPage] = useState(1);
  const deferredIncidentSearch = useDeferredValue(incidentSearch);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    // Reports come from several purpose-specific endpoints instead of one giant payload.
    // That keeps the backend query logic easier to understand and lets each report evolve
    // without forcing every other module to change at the same time.
    setLoading(true);
    setError(null);
    setLoadWarning(null);

    try {
      const results = await Promise.allSettled([
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
      const warnings: string[] = [];

      const [, , safehouseReportResult, , reintegrationRiskResult, , , , trendDeploymentResult, safehouseDataResult, incidentDataResult, residentDataResult] = results;

      const safehouseReport = safehouseReportResult.status === 'fulfilled' ? safehouseReportResult.value : null;
      const reintegrationRiskData = reintegrationRiskResult.status === 'fulfilled' ? reintegrationRiskResult.value : null;
      const trendDeploymentData = trendDeploymentResult.status === 'fulfilled' ? trendDeploymentResult.value : null;
      const safehouseData = safehouseDataResult.status === 'fulfilled' ? safehouseDataResult.value : [];
      const incidentData = incidentDataResult.status === 'fulfilled' ? incidentDataResult.value : [];
      const residentData = residentDataResult.status === 'fulfilled' ? residentDataResult.value : [];

      REPORT_SECTION_FALLBACKS.forEach(([label, fallback], index) => {
        const result = results[index];
        if (result.status === 'rejected') {
          warnings.push(describeUnavailableSection(label, result.reason, fallback));
        }
      });

      // Some analytics cards still use curated seed data so the page stays explorable while live modules roll in incrementally.
      setDonationTrends(MOCK_DONATION_TRENDS);
      setResidentOutcomes(MOCK_RESIDENT_OUTCOMES);
      setSafehousePerformance(safehouseReport);
      setReintegrationSummary(MOCK_REINTEGRATION_SUMMARY);
      setReintegrationRiskSummary(reintegrationRiskData);
      setOutreachPerformance(MOCK_OUTREACH_PERFORMANCE);
      setSocialAnalytics(MOCK_SOCIAL_ANALYTICS);
      setCounselingRiskSummary(MOCK_COUNSELING_RISK_SUMMARY);
      setTrendDeployments(trendDeploymentData);
      setSafehouses(safehouseData);
      setIncidents(incidentData);
      setResidents(residentData);
      setViewingSafehouseId((current) => safehouseData.some((safehouse) => safehouse.id === current) ? current : null);
      setSelectedIncidentId((current) => incidentData.some((incident) => incident.id === current) ? current : null);
      setSafehouseForm((current) => current.code ? current : createSafehouseForm());
      setIncidentForm((current) => current.residentId > 0 ? current : createIncidentForm(residentData[0]?.id, safehouseData[0]?.id));

      if (results.every((result) => result.status === 'rejected')) {
        const firstRejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        setError(getRequestErrorMessage(firstRejected?.reason, 'Failed to load analytics.'));
      } else {
        setLoadWarning(combineUnavailableSections(warnings));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    setSocialPostsPage(1);
  }, [socialPlatformFilter, socialTypeFilter]);

  useEffect(() => {
    setSafehouseRecordsPage(1);
  }, [safehouseStatusFilter]);

  useEffect(() => {
    setIncidentPage(1);
  }, [deferredIncidentSearch, incidentSeverityFilter]);

  useEffect(() => {
    const trendRows = safehousePerformance?.monthlyTrends ?? [];
    if (trendRows.length === 0) {
      setSelectedTrendSafehouseId(null);
      return;
    }

    setSelectedTrendSafehouseId((current) =>
      trendRows.some((row) => row.safehouseId === current) ? current : trendRows[0]?.safehouseId ?? null,
    );
  }, [safehousePerformance]);

  useEffect(() => {
    setSelectedTrendMonthPage(1);
  }, [selectedTrendSafehouseId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setViewingSafehouseId(null);
      setSelectedIncidentId(null);
      setEditingSafehouseId(null);
      setSafehouseForm(createSafehouseForm());
      setEditingIncidentId(null);
      setIncidentForm(createIncidentForm(residents[0]?.id, safehouses[0]?.id));
    };

    if (!viewingSafehouseId && !selectedIncidentId && !editingSafehouseId && !editingIncidentId) {
      return undefined;
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [viewingSafehouseId, selectedIncidentId, editingSafehouseId, editingIncidentId, residents, safehouses]);

  if (!user) return null;

  const performanceRows = safehousePerformance?.safehouses ?? [];
  const reintegrationRiskRows = reintegrationRiskSummary?.topRiskResidents ?? [];
  const counselingRiskRows = counselingRiskSummary?.topRiskSessions ?? [];
  const trendDeploymentRows = trendDeployments?.rows ?? [];
  // The page mixes reporting modules, admin maintenance views, and advisory tools in one workspace,
  // so derive each slice once here before handing smaller pieces to the UI sections below.
  const totalRaised = donationTrends?.monthlyTotals.reduce((sum, point) => sum + point.totalAmount, 0) ?? 0;
  const totalReferrals = outreachPerformance?.platformSummaries.reduce((sum, item) => sum + item.totalDonationReferrals, 0) ?? 0;
  const highRiskResidents = residentOutcomes?.followUpBurden.highRiskResidents ?? 0;
  const openIncidentCount = incidents.filter((incident) => !incident.resolved).length;
  const filteredSafehouses = safehouses.filter((safehouse) => safehouseStatusFilter === 'All' || safehouse.status === safehouseStatusFilter);
  const filteredSocialPosts = (socialAnalytics?.posts ?? []).filter(
    (post) =>
      (socialPlatformFilter === 'All' || post.platform === socialPlatformFilter) &&
      (socialTypeFilter === 'All' || post.postType === socialTypeFilter),
  );
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
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? null;
  const selectedSafehouse = safehouses.find((safehouse) => safehouse.id === viewingSafehouseId) ?? null;
  const trendSafehouseRows = safehousePerformance?.monthlyTrends ?? [];
  const selectedTrendSafehouse =
    trendSafehouseRows.find((row) => row.safehouseId === selectedTrendSafehouseId) ?? trendSafehouseRows[0] ?? null;
  const selectedTrendMaxHealth = Math.max(...(selectedTrendSafehouse?.monthlyTrend.map((point) => point.avgHealthScore) ?? [1]), 1);
  const pagedTrendMonths = paginateItems(selectedTrendSafehouse?.monthlyTrend ?? [], selectedTrendMonthPage, TREND_BARS_PAGE_SIZE);
  const pagedPerformanceRows = paginateItems(performanceRows, safehousePerformancePage, DEFAULT_TABLE_PAGE_SIZE);
  const pagedReintegrationRiskRows = paginateItems(reintegrationRiskRows, reintegrationRiskPage, DEFAULT_TABLE_PAGE_SIZE);
  const pagedSocialPosts = paginateItems(filteredSocialPosts, socialPostsPage, LARGE_TABLE_PAGE_SIZE);
  const pagedSafehouses = paginateItems(filteredSafehouses, safehouseRecordsPage, DEFAULT_TABLE_PAGE_SIZE);
  const pagedCounselingRiskRows = paginateItems(counselingRiskRows, counselingRiskPage, DEFAULT_TABLE_PAGE_SIZE);
  const pagedIncidents = paginateItems(filteredIncidents, incidentPage, DEFAULT_TABLE_PAGE_SIZE);
  const pagedTrendDeployments = paginateItems(trendDeploymentRows, trendDeploymentsPage, DEFAULT_TABLE_PAGE_SIZE);

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
    if (!user || !editingSafehouseId) return;
    setSubmitting('safehouse');
    setFeedback(null);

    try {
      const payload = { ...safehouseForm, notes: safehouseForm.notes || null };
      await api.updateSafehouse(editingSafehouseId, payload);
      setFeedback({ tone: 'success', message: 'Safehouse updated.' });
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
    if (!user || !editingIncidentId) return;
    setSubmitting('incident');
    setFeedback(null);

    try {
      const payload = {
        ...incidentForm,
        resolutionDate: incidentForm.resolutionDate || null,
      };
      await api.updateIncident(editingIncidentId, payload);
      setFeedback({ tone: 'success', message: 'Incident updated.' });
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
      if (viewingSafehouseId === id) setViewingSafehouseId(null);
      if (editingSafehouseId === id) resetSafehouseForm();
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
      if (editingIncidentId === id) resetIncidentForm();
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

  const reportHeaderActions = isAdmin
    ? [
        { label: 'Create Safehouse', to: '/portal/reports/safehouses/new' },
        { label: 'Create Incident', to: '/portal/reports/incidents/new' },
      ]
    : undefined;

  return (
    <div className="page-shell">
      <StaffPortalPageHeader
        eyebrow="Decision support"
        title="Reports & analytics"
        description="Review donation trends, resident outcomes, safehouse performance, reintegration progress, and outreach results."
        actions={reportHeaderActions}
      />

      <section className="page-grid four">
        <MetricCard label="Total giving tracked" value={formatMoney(totalRaised)} detail="Combined donation totals across the reporting period." accent />
        <MetricCard label="High-risk residents" value={String(highRiskResidents)} detail="Residents currently flagged high or critical risk." />
        <MetricCard label="Open incidents" value={String(openIncidentCount)} detail="Operational incidents still unresolved." />
        <MetricCard label="Outreach referrals" value={String(totalReferrals)} detail="Donation referrals attributed to social content." />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}
      {loadWarning ? <FeedbackBanner tone="info" message={loadWarning} /> : null}

      {loading ? (
        <LoadingState label="Loading analytics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAnalytics} />
      ) : (
        <>
          <div className="report-tab-bar">
            {REPORTS.map((report) => (
              <button
                key={report.key}
                type="button"
                className={`ghost-button${activeReport === report.key ? ' active' : ''}`}
                onClick={() => setActiveReport(report.key)}
              >
                {report.label}
              </button>
            ))}
          </div>

          {activeReport === 'donation-trends' && (
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
                  <ReportTableSection
                    title="Contribution mix"
                    description="See how cash and in-kind support are distributed across donation types."
                    countLabel={`${donationTrends.contributionMix.length} categories`}
                  >
                    <DataTable
                      columns={['Type', 'Amount', 'Count']}
                      rows={donationTrends.contributionMix.map((item) => [
                        item.donationType,
                        formatMoney(item.totalAmount),
                        item.donationCount,
                      ])}
                      emptyMessage="No donation mix data available."
                    />
                  </ReportTableSection>
                </>
              ) : (
                <EmptyState title="No donation trend data" message="No donation trend data was returned." />
              )}
            </SectionCard>
          )}

          {activeReport === 'resident-outcomes' && (
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
          )}

          {activeReport === 'safehouse-performance' && (
            <SectionCard title="Safehouse performance" subtitle="Occupancy, incidents, residents, and allocation totals by location">
              <ReportTableSection
                title="Performance snapshot"
                description="Compare operational load, resident counts, and allocation totals across active locations."
                countLabel={`${performanceRows.length} safehouses`}
              >
                <DataTable
                  columns={['Safehouse', 'Occupancy', 'Residents', 'Incidents', 'Allocated']}
                  rows={pagedPerformanceRows.items.map((safehouse) => [
                    safehouse.safehouseName,
                    `${safehouse.currentOccupancy}/${safehouse.capacityGirls}`,
                    safehouse.residentCount,
                    safehouse.incidentCount,
                    formatMoney(safehouse.donationAllocationTotal),
                  ])}
                  emptyMessage="No safehouse performance data is available."
                />
                <Pagination
                  page={pagedPerformanceRows.currentPage}
                  totalPages={pagedPerformanceRows.totalPages}
                  totalItems={performanceRows.length}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onChange={setSafehousePerformancePage}
                />
              </ReportTableSection>
              {safehousePerformance?.monthlyTrends && safehousePerformance.monthlyTrends.length > 0 ? (
                <div className="report-chart-section">
                  <div className="report-table-header">
                    <div className="report-table-copy">
                      <h3>Monthly health score trend</h3>
                      <p>Track how resident health scoring is moving within each safehouse over time.</p>
                    </div>
                  </div>
                  <div className="safehouse-trend-tabs" role="tablist" aria-label="Safehouse monthly health trend tabs">
                    {trendSafehouseRows.map((row) => (
                      <button
                        key={row.safehouseId}
                        type="button"
                        role="tab"
                        aria-selected={selectedTrendSafehouse?.safehouseId === row.safehouseId}
                        className={`safehouse-trend-tab${selectedTrendSafehouse?.safehouseId === row.safehouseId ? ' active' : ''}`}
                        onClick={() => setSelectedTrendSafehouseId(row.safehouseId)}
                      >
                        {row.safehouseName}
                      </button>
                    ))}
                  </div>
                  {selectedTrendSafehouse ? (
                    <div className="chart-safehouse-block safehouse-trend-panel">
                      <div className="safehouse-trend-panel-header">
                        <p className="chart-safehouse-label">{selectedTrendSafehouse.safehouseName}</p>
                        <span className="report-table-meta">{selectedTrendSafehouse.monthlyTrend.length} months tracked</span>
                      </div>
                      <div className="chart-list">
                        {pagedTrendMonths.items.map((point) => (
                          <div className="chart-row" key={point.monthStart}>
                            <span>{point.monthStart.slice(0, 7)}</span>
                            <div className="chart-bar">
                              <div className={chartWidthClass((point.avgHealthScore / selectedTrendMaxHealth) * 100)} />
                            </div>
                            <strong>{point.avgHealthScore.toFixed(1)}</strong>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={pagedTrendMonths.currentPage}
                        totalPages={pagedTrendMonths.totalPages}
                        totalItems={selectedTrendSafehouse.monthlyTrend.length}
                        pageSize={TREND_BARS_PAGE_SIZE}
                        onChange={setSelectedTrendMonthPage}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </SectionCard>
          )}

          {activeReport === 'reintegration' && (
            <SectionCard title="Reintegration summary" subtitle="Current reintegration status and pathway mix">
              {reintegrationSummary ? (
                <>
                  <DataTable
                    columns={['Status', 'Residents']}
                    rows={reintegrationSummary.reintegrationStatuses.map((item) => [item.label, item.count])}
                    emptyMessage="No reintegration summary data is available."
                  />
                  <ReportTableSection
                    title="Risk watchlist"
                    description="Focus follow-up attention on residents with elevated reintegration risk signals."
                    countLabel={`${reintegrationRiskRows.length} residents`}
                  >
                    <DataTable
                      columns={['Resident', 'Risk score', 'Positive trajectory', 'Action']}
                      rows={pagedReintegrationRiskRows.items.map((item) => [
                        item.residentCode,
                        `${(item.riskScore * 100).toFixed(1)}%`,
                        `${(item.positiveProbability * 100).toFixed(1)}%`,
                        item.recommendedAction,
                      ])}
                      emptyMessage="No reintegration risk data is available."
                    />
                    <Pagination
                      page={pagedReintegrationRiskRows.currentPage}
                      totalPages={pagedReintegrationRiskRows.totalPages}
                      totalItems={reintegrationRiskRows.length}
                      pageSize={DEFAULT_TABLE_PAGE_SIZE}
                      onChange={setReintegrationRiskPage}
                    />
                  </ReportTableSection>
                </>
              ) : (
                <EmptyState title="No reintegration data" message="No reintegration summary data was returned." />
              )}
            </SectionCard>
          )}

          {activeReport === 'social-analytics' && (
            <SectionCard
              title="Social media analytics"
              subtitle="Post-level performance across platforms"
              actions={
                <div className="report-filter-toolbar">
                  <ReportFilterField label="Platform" htmlFor="social-platform-filter">
                    <select
                      id="social-platform-filter"
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
                  </ReportFilterField>
                  <ReportFilterField label="Post type" htmlFor="social-type-filter">
                    <select
                      id="social-type-filter"
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
                  </ReportFilterField>
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
                  <ReportTableSection
                    title="Post performance"
                    description="Review the posts driving the most reach, engagement, and referral activity."
                    countLabel={`${filteredSocialPosts.length} posts`}
                  >
                    <DataTable
                      columns={['Platform', 'Type', 'Date', 'Impressions', 'Reach', 'Engagement', 'CTR', 'Referrals']}
                      rows={pagedSocialPosts.items.map((post) => [
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
                    />
                    <Pagination
                      page={pagedSocialPosts.currentPage}
                      totalPages={pagedSocialPosts.totalPages}
                      totalItems={filteredSocialPosts.length}
                      pageSize={LARGE_TABLE_PAGE_SIZE}
                      onChange={setSocialPostsPage}
                    />
                  </ReportTableSection>
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
                      />
                      <p className="muted-inline">{socialAdvisorPrediction.notes}</p>
                    </>
                  ) : null}
                </>
              ) : (
                <EmptyState title="No social analytics data" message="No social analytics data was returned." />
              )}
            </SectionCard>
          )}

          {activeReport === 'safehouse-records' && (
            <SectionCard
              title="Safehouse records"
              subtitle="Review and manage safehouse locations used in occupancy, incident, and allocation reporting."
              actions={
                <div className="report-filter-toolbar">
                  <ReportFilterField label="Status" htmlFor="safehouse-status-filter">
                    <select
                      id="safehouse-status-filter"
                      aria-label="Filter safehouse status"
                      className="inline-select"
                      value={safehouseStatusFilter}
                      onChange={(event) => setSafehouseStatusFilter(event.target.value)}
                    >
                      <option>All</option>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </ReportFilterField>
                </div>
              }
            >
              <ReportTableSection
                title="Operations directory"
                description="Keep location records clean so dashboards and operational reports stay trustworthy."
                countLabel={`${filteredSafehouses.length} safehouses`}
              >
                <DataTable
                  columns={['Safehouse', 'Status', 'Occupancy', 'Actions']}
                  rows={pagedSafehouses.items.map((safehouse) => [
                    safehouse.name,
                    <StatusBadge key={`sh-status-${safehouse.id}`} value={safehouse.status} />,
                    `${safehouse.currentOccupancy}/${safehouse.capacityGirls}`,
                    <div className="table-actions" key={`safehouse-actions-${safehouse.id}`}>
                      <button className="ghost-button" onClick={() => setViewingSafehouseId(safehouse.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setViewingSafehouseId(null);
                              setEditingSafehouseId(safehouse.id);
                              setSafehouseForm(createSafehouseFormFromRecord(safehouse));
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteSafehouse(safehouse.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                  emptyMessage="No safehouses match the current filter."
                />
                <Pagination
                  page={pagedSafehouses.currentPage}
                  totalPages={pagedSafehouses.totalPages}
                  totalItems={filteredSafehouses.length}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onChange={setSafehouseRecordsPage}
                />
              </ReportTableSection>
            </SectionCard>
          )}

          {activeReport === 'counseling-risk' && (
            <SectionCard title="Counseling escalation risk" subtitle="Session-level concern probability for supervisor triage.">
              <section className="page-grid four compact">
                <MetricCard label="Evaluated sessions" value={String(counselingRiskSummary?.evaluatedSessions ?? 0)} detail="Sessions scored with deployed concern model." />
                <MetricCard label="High risk" value={String(counselingRiskSummary?.highRiskCount ?? 0)} detail="Immediate supervisor review recommended." accent />
                <MetricCard label="Medium risk" value={String(counselingRiskSummary?.mediumRiskCount ?? 0)} detail="Review in regular cadence." />
                <MetricCard label="Low risk" value={String(counselingRiskSummary?.lowRiskCount ?? 0)} detail="Monitor in routine check-ins." />
              </section>
              <ReportTableSection
                title="Escalation watchlist"
                description="Surface sessions that need quicker supervisor attention and clearer intervention planning."
                countLabel={`${counselingRiskRows.length} scored sessions`}
              >
                <DataTable
                  columns={['Resident', 'Date', 'Session', 'Concern probability', 'Tier', 'Primary factor']}
                  rows={pagedCounselingRiskRows.items.map((item) => [
                    item.residentCode,
                    item.sessionDate,
                    item.sessionType,
                    `${(item.concernProbability * 100).toFixed(1)}%`,
                    item.riskTier,
                    item.primaryFactor,
                  ])}
                  emptyMessage="No counseling risk rows were returned."
                />
                <Pagination
                  page={pagedCounselingRiskRows.currentPage}
                  totalPages={pagedCounselingRiskRows.totalPages}
                  totalItems={counselingRiskRows.length}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onChange={setCounselingRiskPage}
                />
              </ReportTableSection>
            </SectionCard>
          )}

          {activeReport === 'incident-watchlist' && (
            <SectionCard
              title="Incident watchlist"
              subtitle="Scan active incidents quickly, then open a focused modal when you need the full record."
              actions={
                <div className="report-filter-toolbar">
                  <ReportFilterField label="Search" htmlFor="incident-search-filter">
                    <input
                      id="incident-search-filter"
                      aria-label="Search incidents"
                      className="inline-search"
                      placeholder="Resident, safehouse, type, or reporter"
                      value={incidentSearch}
                      onChange={(event) => setIncidentSearch(event.target.value)}
                    />
                  </ReportFilterField>
                  <ReportFilterField label="Severity" htmlFor="incident-severity-filter">
                    <select
                      id="incident-severity-filter"
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
                  </ReportFilterField>
                </div>
              }
            >
              <ReportTableSection
                title="Open incident list"
                description="Use the watchlist to review incident severity and jump into the full record when needed."
                countLabel={`${filteredIncidents.length} incidents`}
              >
                <DataTable
                  columns={['Resident', 'Safehouse', 'Type', 'Severity', 'Actions']}
                  rows={pagedIncidents.items.map((incident) => [
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
                              setSelectedIncidentId(null);
                              setEditingIncidentId(incident.id);
                              setIncidentForm(createIncidentFormFromRecord(incident));
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
                />
                <Pagination
                  page={pagedIncidents.currentPage}
                  totalPages={pagedIncidents.totalPages}
                  totalItems={filteredIncidents.length}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onChange={setIncidentPage}
                />
              </ReportTableSection>
            </SectionCard>
          )}

          {activeReport === 'trend-deployments' && (
            <SectionCard title="Deep trend deployment scorecards" subtitle="Operational bridge for all six new exploratory/explanatory trend pipelines.">
              <ReportTableSection
                title="Deployment bridge"
                description="Connect each deployed trend model to its current metric, endpoint, and operational next step."
                countLabel={`${trendDeploymentRows.length} pipelines`}
              >
                <DataTable
                  columns={['Pipeline', 'Primary metric', 'Current value', 'Endpoint', 'Recommendation']}
                  rows={pagedTrendDeployments.items.map((row) => [
                    row.pipelineKey,
                    row.primaryMetric,
                    Number.isFinite(row.currentValue) ? row.currentValue.toFixed(4) : '0.0000',
                    row.endpointPath,
                    row.recommendation,
                  ])}
                  emptyMessage="Trend deployment rows are not available."
                />
                <Pagination
                  page={pagedTrendDeployments.currentPage}
                  totalPages={pagedTrendDeployments.totalPages}
                  totalItems={trendDeploymentRows.length}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onChange={setTrendDeploymentsPage}
                />
              </ReportTableSection>
            </SectionCard>
          )}

          {selectedSafehouse ? (
            <AnalyticsModal
              title={selectedSafehouse.name}
              subtitle="Safehouse record details for operational reporting and allocation oversight."
              onClose={() => setViewingSafehouseId(null)}
              className="analytics-view-modal"
            >
              <DetailPanel title="Location summary" subtitle="Key attributes used throughout reporting and operations." className="detail-panel-neutral">
                <DetailList
                  items={[
                    { label: 'Code', value: selectedSafehouse.code },
                    { label: 'Status', value: selectedSafehouse.status },
                    { label: 'Region', value: selectedSafehouse.region },
                    { label: 'City', value: `${selectedSafehouse.city}, ${selectedSafehouse.province}` },
                    { label: 'Country', value: selectedSafehouse.country },
                    { label: 'Open date', value: formatDate(selectedSafehouse.openDate) },
                    { label: 'Occupancy', value: `${selectedSafehouse.currentOccupancy}/${selectedSafehouse.capacityGirls}` },
                    { label: 'Staff capacity', value: selectedSafehouse.capacityStaff },
                    { label: 'Notes', value: selectedSafehouse.notes || 'No notes added.' },
                  ]}
                />
              </DetailPanel>
              {isAdmin ? (
                <div className="analytics-modal-actions">
                  <button
                    className="primary-button"
                    onClick={() => {
                      setViewingSafehouseId(null);
                      setEditingSafehouseId(selectedSafehouse.id);
                      setSafehouseForm(createSafehouseFormFromRecord(selectedSafehouse));
                    }}
                    type="button"
                  >
                    Edit safehouse
                  </button>
                </div>
              ) : null}
            </AnalyticsModal>
          ) : null}

          {selectedIncident ? (
            <AnalyticsModal
              title={`${selectedIncident.residentCode} incident`}
              subtitle="Review the full incident context without shrinking the watchlist table."
              onClose={() => setSelectedIncidentId(null)}
              className="analytics-view-modal"
            >
              <DetailPanel title="Incident details" subtitle="Context, actions taken, and what still needs follow-up." className="detail-panel-neutral">
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
                    { label: 'Resolved', value: selectedIncident.resolved ? 'Yes' : 'No' },
                  ]}
                />
              </DetailPanel>
              {isAdmin ? (
                <div className="analytics-modal-actions">
                  <button
                    className="primary-button"
                    onClick={() => {
                      setSelectedIncidentId(null);
                      setEditingIncidentId(selectedIncident.id);
                      setIncidentForm(createIncidentFormFromRecord(selectedIncident));
                    }}
                    type="button"
                  >
                    Edit incident
                  </button>
                </div>
              ) : null}
            </AnalyticsModal>
          ) : null}

          {isAdmin && editingSafehouseId ? (
            <AnalyticsModal
              title="Edit safehouse"
              subtitle="Maintain the location record used across occupancy, incident, and allocation reporting."
              onClose={resetSafehouseForm}
              className="analytics-edit-modal"
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
                <label htmlFor="sh-notes"><span>Notes</span><textarea id="sh-notes" value={safehouseForm.notes ?? ''} onChange={(event) => setSafehouseForm({ ...safehouseForm, notes: event.target.value })} rows={4} /></label>
                <div className="form-actions">
                  <button className="ghost-button" onClick={resetSafehouseForm} type="button">Cancel</button>
                  <button className="primary-button" disabled={submitting === 'safehouse'} type="submit">
                    {submitting === 'safehouse' ? 'Saving...' : 'Update safehouse'}
                  </button>
                </div>
              </form>
            </AnalyticsModal>
          ) : null}

          {isAdmin && editingIncidentId ? (
            <AnalyticsModal
              title="Edit incident"
              subtitle="Update the watchlist record without leaving the analytics workflow."
              onClose={resetIncidentForm}
              className="analytics-edit-modal"
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
                <label htmlFor="inc-description"><span>Description</span><textarea id="inc-description" value={incidentForm.description} onChange={(event) => setIncidentForm({ ...incidentForm, description: event.target.value })} rows={4} required /></label>
                <label htmlFor="inc-response"><span>Response taken</span><textarea id="inc-response" value={incidentForm.responseTaken} onChange={(event) => setIncidentForm({ ...incidentForm, responseTaken: event.target.value })} rows={4} required /></label>
                <div className="check-grid">
                  <CheckboxField label="Resolved" checked={incidentForm.resolved} onChange={(checked) => setIncidentForm({ ...incidentForm, resolved: checked })} />
                  <CheckboxField label="Follow-up required" checked={incidentForm.followUpRequired} onChange={(checked) => setIncidentForm({ ...incidentForm, followUpRequired: checked })} />
                </div>
                <label htmlFor="inc-resolution-date"><span>Resolution date</span><input id="inc-resolution-date" type="date" value={incidentForm.resolutionDate ?? ''} onChange={(event) => setIncidentForm({ ...incidentForm, resolutionDate: event.target.value })} /></label>
                <div className="form-actions">
                  <button className="ghost-button" onClick={resetIncidentForm} type="button">Cancel</button>
                  <button className="primary-button" disabled={submitting === 'incident'} type="submit">
                    {submitting === 'incident' ? 'Saving...' : 'Update incident'}
                  </button>
                </div>
              </form>
            </AnalyticsModal>
          ) : null}
        </>
      )}
    </div>
  );
}
