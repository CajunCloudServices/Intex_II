import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type {
  Donation,
  DonationAllocation,
  DonationRequest,
  DonorChurnRiskRow,
  DonorChurnRiskSummary,
  Safehouse,
  Supporter,
  SupporterRequest,
} from '../../api/types';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatCompactMoney, formatDate, formatMoney, normalizeText } from '../../lib/format';
import { sanitizeOptionalText, sanitizeText, type ValidationErrors } from '../../lib/validation';
import { createDonationForm, defaultSupporterForm } from './forms/donorFormDefaults';
import { DonationRecordForm } from './forms/DonationRecordForm';
import { validateDonationForm, validateSupporterForm } from './forms/donorsFormValidation';
import { SupporterRecordForm } from './forms/SupporterRecordForm';

const SUPPORTERS_PAGE_SIZE = 4;
const DONATIONS_PAGE_SIZE = 4;

type SummaryItem = {
  label: string;
  count: number;
  amount: number;
  detail?: string;
};

type AllocationSummaryItem = {
  label: string;
  amount: number;
  count: number;
};

type SupporterDirectoryEntry = {
  key: string;
  kind: 'supporter' | 'anonymous';
  supporterId: number | null;
  displayName: string;
  supporterType: string;
  status: string;
  email: string | null;
  phone: string | null;
  region: string;
  country: string;
  relationshipType: string;
  acquisitionChannel: string;
  firstDonationDate: string | null;
  donationCount: number;
  lifetimeGiving: number;
  donorCount: number;
  lastDonationDate: string | null;
  donationHistory: Donation[];
  canEdit: boolean;
};

export function DonorsContributionsPage() {
  const { user } = useAuth();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [churnRiskSummary, setChurnRiskSummary] = useState<DonorChurnRiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [supporterSearch, setSupporterSearch] = useState('');
  const [supporterStatusFilter, setSupporterStatusFilter] = useState('All');
  const [supporterTypeFilter, setSupporterTypeFilter] = useState('All');
  const [donationSearch, setDonationSearch] = useState('');
  const [donationTypeFilter, setDonationTypeFilter] = useState('All');
  const [donationSupporterFilter, setDonationSupporterFilter] = useState('All');
  const [supporterPage, setSupporterPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [editingSupporterId, setEditingSupporterId] = useState<number | null>(null);
  const [editingDonationId, setEditingDonationId] = useState<number | null>(null);
  const [supporterForm, setSupporterForm] = useState<SupporterRequest>(defaultSupporterForm);
  const [donationForm, setDonationForm] = useState<DonationRequest>(createDonationForm());
  const [supporterErrors, setSupporterErrors] = useState<ValidationErrors>({});
  const [donationErrors, setDonationErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const deferredSupporterSearch = useDeferredValue(supporterSearch);
  const deferredDonationSearch = useDeferredValue(donationSearch);
  const canManageDonors = (user?.roles.includes('Admin') ?? false) || (user?.roles.includes('Staff') ?? false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [supportersData, donationsData, safehouseData, churnRiskData] = await Promise.all([
        api.supporters(),
        api.donations(),
        api.safehouses(),
        api.donorChurnRiskSummary(12),
      ]);
      setSupporters(supportersData);
      setDonations(donationsData);
      setSafehouses(safehouseData);
      setChurnRiskSummary(churnRiskData);
      setDonationForm((current) => (current.allocations[0].safehouseId > 0 ? current : createDonationForm(safehouseData[0]?.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donor data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!editingDonationId && !editingSupporterId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (editingDonationId) {
          resetDonationForm();
        } else if (editingSupporterId) {
          resetSupporterForm();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingDonationId, editingSupporterId]);

  const supporterDonations = useMemo(() => {
    const grouped = new Map<number, Donation[]>();
    donations.forEach((donation) => {
      const existing = grouped.get(donation.supporterId) ?? [];
      existing.push(donation);
      grouped.set(donation.supporterId, existing);
    });

    grouped.forEach((items, supporterId) => {
      grouped.set(
        supporterId,
        [...items].sort((left, right) => new Date(right.donationDate).getTime() - new Date(left.donationDate).getTime()),
      );
    });

    return grouped;
  }, [donations]);

  const anonymousSupporters = useMemo(() => supporters.filter(isAnonymousSupporter), [supporters]);
  const namedSupporters = useMemo(() => supporters.filter((supporter) => !isAnonymousSupporter(supporter)), [supporters]);
  const sortedDonations = useMemo(
    () => [...donations].sort((left, right) => new Date(right.donationDate).getTime() - new Date(left.donationDate).getTime()),
    [donations],
  );

  const allSupporterEntries = useMemo<SupporterDirectoryEntry[]>(() => {
    const namedEntries = namedSupporters
      .map((supporter) => {
        const donationHistory = supporterDonations.get(supporter.id) ?? [];
        return {
          key: `supporter-${supporter.id}`,
          kind: 'supporter' as const,
          supporterId: supporter.id,
          displayName: supporter.displayName,
          supporterType: humanizeLabel(supporter.supporterType),
          status: supporter.status,
          email: supporter.email,
          phone: supporter.phone ?? null,
          region: supporter.region,
          country: supporter.country,
          relationshipType: humanizeLabel(supporter.relationshipType),
          acquisitionChannel: humanizeLabel(supporter.acquisitionChannel),
          firstDonationDate: supporter.firstDonationDate ?? null,
          donationCount: supporter.donationCount,
          lifetimeGiving: supporter.lifetimeGiving,
          donorCount: 1,
          lastDonationDate: donationHistory[0]?.donationDate ?? null,
          donationHistory,
          canEdit: true,
        };
      })
      .sort((left, right) => right.lifetimeGiving - left.lifetimeGiving || right.donationCount - left.donationCount);

    const anonymousEntry = buildAnonymousEntry(anonymousSupporters, supporterDonations);
    return anonymousEntry ? [...namedEntries, anonymousEntry] : namedEntries;
  }, [anonymousSupporters, namedSupporters, supporterDonations]);

  const normalizedSupporterSearch = normalizeText(deferredSupporterSearch);
  const normalizedDonationSearch = normalizeText(deferredDonationSearch);

  const supporterTypeOptions = useMemo(
    () => ['All', ...new Set(allSupporterEntries.map((entry) => entry.supporterType).sort((left, right) => left.localeCompare(right)))],
    [allSupporterEntries],
  );

  const donationTypeOptions = useMemo(
    () => ['All', ...new Set(donations.map((donation) => humanizeLabel(donation.donationType)).sort((left, right) => left.localeCompare(right)))],
    [donations],
  );

  const donationSupporterOptions = useMemo(
    () => ['All', ...new Set(donations.map((donation) => donation.supporterName).sort((left, right) => left.localeCompare(right)))],
    [donations],
  );

  const filteredSupporterEntries = useMemo(
    () =>
      allSupporterEntries.filter((entry) => {
        const matchesSearch =
          !normalizedSupporterSearch ||
          normalizeText(entry.displayName).includes(normalizedSupporterSearch) ||
          normalizeText(entry.email ?? '').includes(normalizedSupporterSearch) ||
          normalizeText(entry.supporterType).includes(normalizedSupporterSearch);
        const matchesStatus = supporterStatusFilter === 'All' || entry.status === supporterStatusFilter;
        const matchesType = supporterTypeFilter === 'All' || entry.supporterType === supporterTypeFilter;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [allSupporterEntries, normalizedSupporterSearch, supporterStatusFilter, supporterTypeFilter],
  );

  const filteredDonations = useMemo(
    () =>
      sortedDonations.filter((donation) => {
        const matchesSearch =
          !normalizedDonationSearch ||
          normalizeText(donation.supporterName).includes(normalizedDonationSearch) ||
          normalizeText(donation.campaignName ?? '').includes(normalizedDonationSearch) ||
          normalizeText(donation.channelSource).includes(normalizedDonationSearch) ||
          normalizeText(donation.donationType).includes(normalizedDonationSearch) ||
          donation.allocations.some(
            (allocation) =>
              normalizeText(allocation.safehouseName).includes(normalizedDonationSearch) ||
              normalizeText(allocation.programArea).includes(normalizedDonationSearch),
          );
        const matchesType = donationTypeFilter === 'All' || humanizeLabel(donation.donationType) === donationTypeFilter;
        const matchesSupporter = donationSupporterFilter === 'All' || donation.supporterName === donationSupporterFilter;
        return matchesSearch && matchesType && matchesSupporter;
      }),
    [donationSupporterFilter, donationTypeFilter, normalizedDonationSearch, sortedDonations],
  );

  useEffect(() => {
    setSupporterPage(1);
  }, [deferredSupporterSearch, supporterStatusFilter, supporterTypeFilter]);

  useEffect(() => {
    setDonationPage(1);
  }, [deferredDonationSearch, donationTypeFilter, donationSupporterFilter]);

  const paginatedSupporters = useMemo(
    () => paginateItems(filteredSupporterEntries, supporterPage, SUPPORTERS_PAGE_SIZE),
    [filteredSupporterEntries, supporterPage],
  );

  const paginatedDonations = useMemo(
    () => paginateItems(filteredDonations, donationPage, DONATIONS_PAGE_SIZE),
    [filteredDonations, donationPage],
  );

  const supporterTotalPages = Math.max(1, Math.ceil(filteredSupporterEntries.length / SUPPORTERS_PAGE_SIZE));
  const donationTotalPages = Math.max(1, Math.ceil(filteredDonations.length / DONATIONS_PAGE_SIZE));

  useEffect(() => {
    if (supporterPage > supporterTotalPages) {
      setSupporterPage(supporterTotalPages);
    }
  }, [supporterPage, supporterTotalPages]);

  useEffect(() => {
    if (donationPage > donationTotalPages) {
      setDonationPage(donationTotalPages);
    }
  }, [donationPage, donationTotalPages]);

  const totalRaised = donations.reduce((sum, donation) => sum + donationValue(donation), 0);
  const recurringDonations = donations.filter((donation) => donation.isRecurring).length;
  const activeSupporters = allSupporterEntries.filter((entry) => entry.status === 'Active').length;
  const activeRate = allSupporterEntries.length > 0 ? Math.round((activeSupporters / allSupporterEntries.length) * 100) : 0;

  const supporterOptions = useMemo(
    () => supporters.map((supporter) => ({ value: supporter.id, label: `${supporter.displayName} (${supporter.email})` })),
    [supporters],
  );

  const topSupporterTypes = useMemo(
    () =>
      summarizeDirectoryTypes(allSupporterEntries)
        .sort((left, right) => right.count - left.count || right.amount - left.amount)
        .slice(0, 5),
    [allSupporterEntries],
  );

  const topContributionMix = useMemo(
    () =>
      summarizeDonationTypes(donations)
        .sort((left, right) => right.amount - left.amount || right.count - left.count)
        .slice(0, 5),
    [donations],
  );

  const topSafehouseAllocations = useMemo(
    () =>
      summarizeAllocations(donations, (allocation) => allocation.safehouseName)
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 5),
    [donations],
  );

  const topProgramAllocations = useMemo(
    () =>
      summarizeAllocations(donations, (allocation) => `${allocation.programArea} • ${allocation.safehouseName}`)
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 5),
    [donations],
  );

  if (!user) return null;

  const resetSupporterForm = () => {
    setEditingSupporterId(null);
    setSupporterErrors({});
    setSupporterForm(defaultSupporterForm);
  };

  const resetDonationForm = () => {
    setEditingDonationId(null);
    setDonationErrors({});
    setDonationForm(createDonationForm(safehouses[0]?.id));
  };

  const handleSupporterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting('supporter');
    setFeedback(null);
    const formErrors = validateSupporterForm(supporterForm);
    setSupporterErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(null);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted supporter fields.' });
      return;
    }

    try {
      if (!editingSupporterId) return;
      const payload = {
        ...supporterForm,
        displayName: sanitizeText(supporterForm.displayName),
        email: sanitizeText(supporterForm.email),
        supporterType: sanitizeText(supporterForm.supporterType),
        status: sanitizeText(supporterForm.status),
        relationshipType: sanitizeText(supporterForm.relationshipType),
        region: sanitizeText(supporterForm.region),
        country: sanitizeText(supporterForm.country),
        acquisitionChannel: sanitizeText(supporterForm.acquisitionChannel),
        organizationName: sanitizeOptionalText(supporterForm.organizationName ?? ''),
        firstName: sanitizeOptionalText(supporterForm.firstName ?? ''),
        lastName: sanitizeOptionalText(supporterForm.lastName ?? ''),
        phone: sanitizeOptionalText(supporterForm.phone ?? ''),
        firstDonationDate: supporterForm.firstDonationDate || null,
      };

      await api.updateSupporter(editingSupporterId, payload);
      setFeedback({ tone: 'success', message: 'Supporter updated.' });
      resetSupporterForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Supporter save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleDonationSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting('donation');
    setFeedback(null);
    const formErrors = validateDonationForm(donationForm);
    setDonationErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(null);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted donation fields.' });
      return;
    }

    try {
      if (!editingDonationId) return;
      const payload = {
        ...donationForm,
        donationType: sanitizeText(donationForm.donationType),
        channelSource: sanitizeText(donationForm.channelSource),
        currencyCode: sanitizeOptionalText(donationForm.currencyCode ?? ''),
        impactUnit: sanitizeText(donationForm.impactUnit),
        campaignName: sanitizeOptionalText(donationForm.campaignName ?? ''),
        notes: sanitizeOptionalText(donationForm.notes ?? ''),
        allocations: donationForm.allocations.map((allocation) => ({
          ...allocation,
          programArea: sanitizeText(allocation.programArea),
          allocationNotes: sanitizeOptionalText(allocation.allocationNotes ?? ''),
        })),
      };
      await api.updateDonation(editingDonationId, payload);
      setFeedback({ tone: 'success', message: 'Contribution updated.' });
      resetDonationForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Contribution save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const deleteSupporter = async (id: number) => {
    if (!user || !window.confirm('Delete this supporter? This action requires confirmation.')) return;
    try {
      await api.deleteSupporter(id);
      setFeedback({ tone: 'success', message: 'Supporter deleted.' });
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Supporter delete failed.' });
    }
  };

  const deleteDonation = async (id: number) => {
    if (!user || !window.confirm('Delete this contribution? This action requires confirmation.')) return;
    try {
      await api.deleteDonation(id);
      setFeedback({ tone: 'success', message: 'Contribution deleted.' });
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Contribution delete failed.' });
    }
  };

  const donorHeaderActions = canManageDonors
    ? [
        { label: 'Add Donation', to: '/portal/donors/donations/new' },
        { label: 'Add Supporter', to: '/portal/donors/supporters/new' },
      ]
    : undefined;

  return (
    <div className="page-shell donor-operations-page">
      <StaffPortalPageHeader
        eyebrow="Fundraising operations"
        title="Donors & contributions"
        description="Manage supporter profiles, track every contribution type, and see how support is flowing across safehouses and program areas."
        actions={donorHeaderActions}
      />

      <section className="page-grid four compact">
        <MetricCard label="Supporters" value={String(allSupporterEntries.length)} detail="Visible donor and anonymous-giving entries." accent />
        <MetricCard label="Active" value={String(activeSupporters)} detail={`${activeRate}% of visible supporter entries are active.`} />
        <MetricCard label="Tracked value" value={formatCompactMoney(totalRaised)} detail={`${donations.length} contribution records across all channels.`} />
        <MetricCard label="Recurring gifts" value={String(recurringDonations)} detail="Repeat giving commitments currently on file." />
      </section>

      <SectionCard title="Portfolio snapshot" subtitle="Quickly see who is giving, how they contribute, and where support is being directed.">
        <div className="donor-overview-grid">
          <SummaryPanel
            title="Supporter types"
            items={topSupporterTypes}
            emptyMessage="No supporter classifications yet."
            formatAmount={(value) => `${value.toLocaleString()} donors`}
          />
          <SummaryPanel
            title="Contribution mix"
            items={topContributionMix}
            emptyMessage="No contribution activity yet."
            formatAmount={(value) => formatMoney(value)}
          />
          <SummaryPanel
            title="Safehouse allocations"
            items={topSafehouseAllocations}
            emptyMessage="No safehouse allocations recorded yet."
            formatAmount={(value) => formatMoney(value)}
          />
          <SummaryPanel
            title="Program allocations"
            items={topProgramAllocations}
            emptyMessage="No program allocations recorded yet."
            formatAmount={(value) => formatMoney(value)}
          />
        </div>
      </SectionCard>

      {(churnRiskSummary?.topRisks?.length ?? 0) > 0 ? (
        <SectionCard title="Stewardship watchlist" subtitle="Optional retention insight from current donor churn scoring, kept separate from the core operations workflow.">
          <section className="page-grid four compact">
            <MetricCard label="Evaluated" value={String(churnRiskSummary?.evaluatedSupporters ?? 0)} detail="Supporters included in the latest scoring run." />
            <MetricCard label="High risk" value={String(churnRiskSummary?.highRiskCount ?? 0)} detail="Best candidates for immediate follow-up." accent />
            <MetricCard label="Medium risk" value={String(churnRiskSummary?.mediumRiskCount ?? 0)} detail="Review these relationships this month." />
            <MetricCard label="Low risk" value={String(churnRiskSummary?.lowRiskCount ?? 0)} detail="Continue standard stewardship cadence." />
          </section>
          <div className="risk-card-grid">
            {(churnRiskSummary?.topRisks ?? []).map((risk) => (
              <RiskCard key={risk.supporterId} risk={risk} />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading donor operations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          <section>
            <SectionCard
              title="Supporter directory"
              subtitle="A donor-level view of who is giving, with anonymous support grouped instead of repeated."
              actions={
                <div className="filter-row donor-filter-row donor-filter-grid">
                  <input
                    aria-label="Search supporters"
                    className="inline-search donor-filter-search"
                    placeholder="Search donor name, email, or type..."
                    value={supporterSearch}
                    onChange={(event) => setSupporterSearch(event.target.value)}
                  />
                                    <div className="donor-filter-select-row">
                    <select
                      aria-label="Filter supporters by status"
                      className="inline-select donor-filter-select"
                      value={supporterStatusFilter}
                      onChange={(event) => setSupporterStatusFilter(event.target.value)}
                    >
                      <option>All</option>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                    <select
                      aria-label="Filter supporters by type"
                      className="inline-select donor-filter-select"
                      value={supporterTypeFilter}
                      onChange={(event) => setSupporterTypeFilter(event.target.value)}
                    >
                      {supporterTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              }
            >
              {filteredSupporterEntries.length === 0 ? (
                <EmptyState title="No matching supporters" message="Try a different search or filter combination." />
              ) : (
                <>
                  <div className="supporter-directory-list supporter-directory-list-compact">
                    {paginatedSupporters.map((entry) => (
                      <article className="supporter-directory-card supporter-directory-card-compact" key={entry.key}>
                        <div className="supporter-directory-main">
                          <div className="supporter-directory-head">
                            <div>
                              <h3>{entry.displayName}</h3>
                              <p>
                                {entry.supporterType}
                                {entry.kind === 'anonymous' ? ` • ${entry.donorCount} profiles grouped` : ''}
                              </p>
                            </div>
                            <StatusBadge value={entry.status} />
                          </div>
                          <div className="supporter-directory-amount">
                            <span>Total donated</span>
                            <strong>{formatMoney(entry.lifetimeGiving)}</strong>
                          </div>
                          <div className="supporter-directory-tags">
                            {entry.email ? <span className="supporter-pill">{entry.email}</span> : <span className="supporter-pill">Identity hidden</span>}
                            <span className="supporter-pill">{entry.donationCount} gifts</span>
                            <span className="supporter-pill">
                              {entry.lastDonationDate ? `Last gift ${formatDate(entry.lastDonationDate)}` : 'No gifts yet'}
                            </span>
                          </div>
                        </div>
                        <div className="supporter-directory-actions">
                          <Link className="ghost-button" to={`/portal/donors/supporters/${entry.kind === 'anonymous' ? 'anonymous' : entry.supporterId}/history`}>
                            History
                          </Link>
                          {canManageDonors && entry.canEdit && entry.supporterId ? (
                            <>
                              <button
                                className="ghost-button"
                                onClick={() => {
                                  const supporter = supporters.find((item) => item.id === entry.supporterId);
                                  if (!supporter) return;
                                  setEditingSupporterId(supporter.id);
                                  setSupporterForm({
                                    supporterType: supporter.supporterType,
                                    displayName: supporter.displayName,
                                    organizationName: supporter.organizationName ?? '',
                                    firstName: supporter.firstName ?? '',
                                    lastName: supporter.lastName ?? '',
                                    relationshipType: supporter.relationshipType,
                                    region: supporter.region,
                                    country: supporter.country,
                                    email: supporter.email,
                                    phone: supporter.phone ?? '',
                                    status: supporter.status,
                                    firstDonationDate: supporter.firstDonationDate ?? '',
                                    acquisitionChannel: supporter.acquisitionChannel,
                                  });
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                              <button className="ghost-button danger-button" onClick={() => void deleteSupporter(entry.supporterId!)} type="button">
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  <Pagination
                    page={supporterPage}
                    totalPages={supporterTotalPages}
                    totalItems={filteredSupporterEntries.length}
                    pageSize={SUPPORTERS_PAGE_SIZE}
                    onChange={setSupporterPage}
                  />
                </>
              )}
            </SectionCard>
          </section>

          <section>
            <SectionCard
              title="Contribution activity"
              subtitle="Review monetary, in-kind, time, skills, and social contributions with clear allocation context."
              actions={
                <div className="filter-row donor-filter-row donor-filter-grid">
                  <input
                    aria-label="Search contributions"
                    className="inline-search donor-filter-search"
                    placeholder="Search supporter, campaign, allocation..."
                    value={donationSearch}
                    onChange={(event) => setDonationSearch(event.target.value)}
                  />
                  <div className="donor-filter-select-row">
                    <select
                      aria-label="Filter contributions by type"
                      className="inline-select donor-filter-select"
                      value={donationTypeFilter}
                      onChange={(event) => setDonationTypeFilter(event.target.value)}
                    >
                      {donationTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Filter contributions by supporter"
                      className="inline-select donor-filter-select"
                      value={donationSupporterFilter}
                      onChange={(event) => setDonationSupporterFilter(event.target.value)}
                    >
                      {donationSupporterOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              }
            >
              {filteredDonations.length === 0 ? (
                <EmptyState title="No matching contributions" message="Try a different search term or filter combination." />
              ) : (
                <>
                  <div className="donation-activity-list">
                    {paginatedDonations.map((donation) => {
                      const primaryAllocation = donation.allocations[0] ?? null;
                      const extraAllocationCount = Math.max(0, donation.allocations.length - 1);
                      const metadataItems = [
                        { label: 'Channel', value: humanizeLabel(donation.channelSource) },
                        { label: 'Campaign', value: donation.campaignName || 'Direct support' },
                        { label: 'Frequency', value: donation.isRecurring ? 'Recurring' : 'One-time' },
                        { label: 'Impact unit', value: donation.impactUnit },
                      ];

                      return (
                        <article className="donation-card donation-card-grid" key={donation.id}>
                          <div className="donation-card-main">
                            <div className="donation-card-head">
                              <div className="donation-card-title-group">
                                <h3>{donation.supporterName}</h3>
                                <p>
                                  <span className="supporter-pill donation-type-pill">{humanizeLabel(donation.donationType)}</span>
                                </p>
                                <span>{formatDate(donation.donationDate)}</span>
                              </div>

                              {canManageDonors ? (
                                <div className="donation-card-header-actions">
                                  <button
                                    className="ghost-button donation-card-action-button"
                                    onClick={() => {
                                      setEditingDonationId(donation.id);
                                      setDonationForm({
                                        supporterId: donation.supporterId,
                                        donationType: donation.donationType,
                                        donationDate: donation.donationDate,
                                        channelSource: donation.channelSource,
                                        currencyCode: donation.currencyCode ?? '',
                                        amount: donation.amount,
                                        estimatedValue: donation.estimatedValue,
                                        impactUnit: donation.impactUnit,
                                        isRecurring: donation.isRecurring,
                                        campaignName: donation.campaignName ?? '',
                                        notes: donation.notes ?? '',
                                        allocations:
                                          donation.allocations.length > 0
                                            ? donation.allocations.map((allocation) => ({
                                                safehouseId: allocation.safehouseId,
                                                programArea: allocation.programArea,
                                                amountAllocated: allocation.amountAllocated,
                                                allocationDate: allocation.allocationDate,
                                                allocationNotes: allocation.allocationNotes ?? '',
                                              }))
                                            : createDonationForm(safehouses[0]?.id).allocations,
                                      });
                                    }}
                                    type="button"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    className="ghost-button danger-button donation-card-action-button"
                                    onClick={() => void deleteDonation(donation.id)}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            <div className="donation-card-value">
                              <span>Tracked value</span>
                              <strong>{formatMoney(donationValue(donation))}</strong>
                            </div>

                            <dl className="donation-card-metadata">
                              {metadataItems.map((item) => (
                                <div key={item.label}>
                                  <dt>{item.label}</dt>
                                  <dd>{item.value}</dd>
                                </div>
                              ))}
                            </dl>

                            <div className="donation-card-allocation-summary">
                              <div className="donation-card-allocation">
                                <span>Primary allocation</span>
                                {primaryAllocation ? (
                                  <>
                                    <strong>{primaryAllocation.safehouseName}</strong>
                                    <p>{primaryAllocation.programArea}</p>
                                    <small>
                                      {formatMoney(primaryAllocation.amountAllocated)} • {formatDate(primaryAllocation.allocationDate)}
                                    </small>
                                  </>
                                ) : (
                                  <>
                                    <strong>No allocation recorded</strong>
                                    <p>Assign a safehouse and program area to complete the contribution record.</p>
                                  </>
                                )}
                              </div>

                              {extraAllocationCount > 0 ? <span className="donation-allocation-overflow">+{extraAllocationCount} more allocations</span> : null}
                            </div>

                            {donation.notes ? (
                              <div className="donation-card-notes">
                                <span>Notes</span>
                                <p>{donation.notes}</p>
                              </div>
                            ) : null}
                          </div>

                        </article>
                      );
                    })}
                  </div>

                  <Pagination
                    page={donationPage}
                    totalPages={donationTotalPages}
                    totalItems={filteredDonations.length}
                    pageSize={DONATIONS_PAGE_SIZE}
                    onChange={setDonationPage}
                  />
                </>
              )}
            </SectionCard>
          </section>

        </>
      )}

      {canManageDonors && editingDonationId ? (
        <div
          className="modal-backdrop donation-edit-backdrop"
          onClick={resetDonationForm}
        >
          <div
            aria-labelledby="donation-edit-title"
            aria-modal="true"
            className="modal-surface donation-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="donation-edit-modal-header">
              <div>
                <h2 id="donation-edit-title">Edit contribution</h2>
                <p>Keep the full contribution record accurate while preserving its primary safehouse allocation.</p>
              </div>
              <button className="ghost-button" onClick={resetDonationForm} type="button">
                Close
              </button>
            </div>

            <DonationRecordForm
              donationForm={donationForm}
              setDonationForm={setDonationForm}
              donationErrors={donationErrors}
              supporterOptions={supporterOptions}
              safehouses={safehouses}
              onSubmit={handleDonationSubmit}
              onCancel={resetDonationForm}
              submitting={submitting === 'donation'}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      ) : null}

      {canManageDonors && editingSupporterId ? (
        <div
          className="modal-backdrop supporter-edit-backdrop"
          onClick={resetSupporterForm}
        >
          <div
            aria-labelledby="supporter-edit-title"
            aria-modal="true"
            className="modal-surface donation-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="donation-edit-modal-header">
              <div>
                <h2 id="supporter-edit-title">Edit supporter</h2>
                <p>Update classification, status, and relationship details without leaving the operations dashboard.</p>
              </div>
              <button className="ghost-button" onClick={resetSupporterForm} type="button">
                Close
              </button>
            </div>

            <SupporterRecordForm
              supporterForm={supporterForm}
              setSupporterForm={setSupporterForm}
              supporterErrors={supporterErrors}
              onSubmit={handleSupporterSubmit}
              onCancel={resetSupporterForm}
              submitting={submitting === 'supporter'}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryPanel({
  title,
  items,
  emptyMessage,
  formatAmount,
}: {
  title: string;
  items: SummaryItem[];
  emptyMessage: string;
  formatAmount: (value: number) => string;
}) {
  const max = items[0]?.amount ?? 0;

  return (
    <section className="donor-summary-card">
      <div className="donor-summary-card-header">
        <h3>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="muted-inline">{emptyMessage}</p>
      ) : (
        <div className="donor-summary-list">
          {items.map((item) => (
            <div className="donor-summary-row" key={item.label}>
              <div className="donor-summary-row-copy">
                <strong>{item.label}</strong>
                <span>{item.detail ?? `${item.count} records`}</span>
              </div>
              <div className="donor-summary-bar">
                <span style={{ width: `${max > 0 ? (item.amount / max) * 100 : 0}%` }} />
              </div>
              <div className="donor-summary-amount">{formatAmount(item.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RiskCard({ risk }: { risk: DonorChurnRiskRow }) {
  return (
    <article className="risk-card">
      <div className="risk-card-top">
        <div>
          <h3>{risk.displayName}</h3>
          <p>{risk.lastDonationDate ? `Last gift ${formatDate(risk.lastDonationDate)}` : 'No donation date recorded'}</p>
        </div>
        <span className="risk-score">{(risk.churnProbability * 100).toFixed(1)}%</span>
      </div>
      <div className="risk-card-metrics">
        <span className="supporter-pill">{risk.riskTier} risk</span>
        <span className="supporter-pill">{risk.daysSinceLastDonation} days since gift</span>
        <span className="supporter-pill">{risk.donationCount} gifts tracked</span>
      </div>
      <p className="risk-card-action">{risk.recommendedAction}</p>
      <div className="risk-card-foot">
        <span>Lifetime value</span>
        <strong>{formatMoney(risk.lifetimeDonationAmount)}</strong>
      </div>
    </article>
  );
}

function donationValue(donation: Donation) {
  return donation.amount ?? donation.estimatedValue;
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function summarizeDirectoryTypes(entries: SupporterDirectoryEntry[]): SummaryItem[] {
  const counts = new Map<string, SummaryItem>();
  entries.forEach((entry) => {
    const current = counts.get(entry.supporterType) ?? { label: entry.supporterType, count: 0, amount: 0 };
    current.count += entry.donorCount;
    current.amount += entry.donorCount;
    current.detail = `${entry.supporterType === 'Anonymous' ? 'Grouped' : 'Tracked'} donors`;
    counts.set(entry.supporterType, current);
  });
  return [...counts.values()];
}

function summarizeDonationTypes(donations: Donation[]): SummaryItem[] {
  const counts = new Map<string, SummaryItem>();
  donations.forEach((donation) => {
    const key = humanizeLabel(donation.donationType);
    const current = counts.get(key) ?? { label: key, count: 0, amount: 0 };
    current.count += 1;
    current.amount += donationValue(donation);
    counts.set(key, current);
  });
  return [...counts.values()];
}

function summarizeAllocations(donations: Donation[], getKey: (allocation: DonationAllocation) => string): AllocationSummaryItem[] {
  const counts = new Map<string, AllocationSummaryItem>();
  donations.forEach((donation) => {
    donation.allocations.forEach((allocation) => {
      const key = getKey(allocation);
      const current = counts.get(key) ?? { label: key, amount: 0, count: 0 };
      current.count += 1;
      current.amount += allocation.amountAllocated;
      counts.set(key, current);
    });
  });
  return [...counts.values()];
}

function buildAnonymousEntry(
  anonymousSupporters: Supporter[],
  supporterDonations: Map<number, Donation[]>,
): SupporterDirectoryEntry | null {
  if (anonymousSupporters.length === 0) return null;

  const donationHistory = anonymousSupporters
    .flatMap((supporter) => supporterDonations.get(supporter.id) ?? [])
    .sort((left, right) => new Date(right.donationDate).getTime() - new Date(left.donationDate).getTime());

  return {
    key: 'anonymous',
    kind: 'anonymous',
    supporterId: null,
    displayName: 'Anonymous donors',
    supporterType: 'Anonymous',
    status: anonymousSupporters.some((supporter) => supporter.status === 'Active') ? 'Active' : 'Inactive',
    email: null,
    phone: null,
    region: 'Various',
    country: 'Various',
    relationshipType: 'Anonymous donor',
    acquisitionChannel: 'Mixed',
    firstDonationDate:
      anonymousSupporters
        .map((supporter) => supporter.firstDonationDate)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null,
    donationCount: donationHistory.length,
    lifetimeGiving: donationHistory.reduce((sum, donation) => sum + donationValue(donation), 0),
    donorCount: anonymousSupporters.length,
    lastDonationDate: donationHistory[0]?.donationDate ?? null,
    donationHistory,
    canEdit: false,
  };
}

function isAnonymousSupporter(supporter: Supporter) {
  return normalizeText(supporter.displayName).startsWith('anonymous donor') || normalizeText(supporter.email).startsWith('anonymous+');
}

function humanizeLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
