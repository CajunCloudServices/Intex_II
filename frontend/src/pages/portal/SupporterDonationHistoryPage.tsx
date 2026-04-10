import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import type { Donation, Supporter, SupporterRequest } from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { DetailList } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { compareDateStringsDesc, formatDate, formatMoney, normalizeText } from '../../lib/format';
import { sanitizeOptionalText, sanitizeText, type ValidationErrors } from '../../lib/validation';
import { createSupporterFormFromRecord, defaultSupporterForm } from './forms/donorFormDefaults';
import { validateSupporterForm } from './forms/donorsFormValidation';
import { SupporterRecordForm } from './forms/SupporterRecordForm';

const PAGE_SIZE = 8;

type HistorySubject = {
  id: string;
  displayName: string;
  supporterType: string;
  status: string;
  email: string;
  phone: string;
  region: string;
  country: string;
  relationshipType: string;
  acquisitionChannel: string;
  firstDonationDate: string | null;
  donationCount: number;
  lifetimeGiving: number;
  isAnonymousAggregate: boolean;
};

export function SupporterDonationHistoryPage() {
  const { supporterId } = useParams();
  const { user } = useAuth();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [editingSupporterId, setEditingSupporterId] = useState<number | null>(null);
  const [supporterForm, setSupporterForm] = useState<SupporterRequest>(defaultSupporterForm);
  const [supporterErrors, setSupporterErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [supportersData, donationsData] = await Promise.all([api.supporters(), api.donations()]);
      setSupporters(supportersData);
      setDonations(donationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supporter history.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [deferredSearch]);

  useEffect(() => {
    if (!editingSupporterId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetSupporterForm();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingSupporterId]);

  const isAnonymousRoute = supporterId === 'anonymous';
  const anonymousSupporters = supporters.filter(isAnonymousSupporter);
  const anonymousSupporterIds = useMemo(
    () => new Set(anonymousSupporters.map((supporter) => supporter.id)),
    [anonymousSupporters],
  );

  const historySubject = useMemo<HistorySubject | null>(() => {
    if (isAnonymousRoute) {
      if (anonymousSupporters.length === 0) return null;
      return {
        id: 'anonymous',
        displayName: 'Anonymous donors',
        supporterType: 'Anonymous',
        status: anonymousSupporters.some((supporter) => supporter.status === 'Active') ? 'Active' : 'Inactive',
        email: 'Hidden',
        phone: 'Hidden',
        region: 'Various',
        country: 'Various',
        relationshipType: 'Anonymous donor',
        acquisitionChannel: 'Mixed',
        firstDonationDate: anonymousSupporters
          .map((supporter) => supporter.firstDonationDate)
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null,
        donationCount: anonymousSupporters.reduce((sum, supporter) => sum + supporter.donationCount, 0),
        lifetimeGiving: anonymousSupporters.reduce((sum, supporter) => sum + supporter.lifetimeGiving, 0),
        isAnonymousAggregate: true,
      };
    }

    const supporter = supporters.find((item) => item.id === Number(supporterId));
    if (!supporter) return null;

    return {
      id: String(supporter.id),
      displayName: supporter.displayName,
      supporterType: humanizeLabel(supporter.supporterType),
      status: supporter.status,
      email: supporter.email,
      phone: supporter.phone ?? 'Not provided',
      region: supporter.region,
      country: supporter.country,
      relationshipType: humanizeLabel(supporter.relationshipType),
      acquisitionChannel: humanizeLabel(supporter.acquisitionChannel),
      firstDonationDate: supporter.firstDonationDate ?? null,
      donationCount: supporter.donationCount,
      lifetimeGiving: supporter.lifetimeGiving,
      isAnonymousAggregate: false,
    };
  }, [anonymousSupporters, isAnonymousRoute, supporterId, supporters]);

  const scopedDonations = useMemo(() => {
    if (isAnonymousRoute) {
      return donations.filter((donation) => anonymousSupporterIds.has(donation.supporterId));
    }
    return donations.filter((donation) => donation.supporterId === Number(supporterId));
  }, [anonymousSupporterIds, donations, isAnonymousRoute, supporterId]);

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredDonations = useMemo(
    () =>
      scopedDonations
        .filter((donation) => {
          if (!normalizedSearch) return true;
          return (
            normalizeText(donation.supporterName).includes(normalizedSearch) ||
            normalizeText(donation.donationType).includes(normalizedSearch) ||
            normalizeText(donation.campaignName ?? 'Direct support').includes(normalizedSearch) ||
            normalizeText(donation.channelSource).includes(normalizedSearch) ||
            donation.allocations.some(
              (allocation) =>
                normalizeText(allocation.safehouseName).includes(normalizedSearch) ||
                normalizeText(allocation.programArea).includes(normalizedSearch),
            )
          );
        })
        .sort((left, right) => compareDateStringsDesc(left.donationDate, right.donationDate)),
    [normalizedSearch, scopedDonations],
  );

  const recurringCount = scopedDonations.filter((donation) => donation.isRecurring).length;
  const totalPages = Math.max(1, Math.ceil(filteredDonations.length / PAGE_SIZE));
  const pagedDonations = filteredDonations.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  const allocationBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    scopedDonations.forEach((donation) => {
      donation.allocations.forEach((allocation) => {
        const key = `${allocation.programArea} • ${allocation.safehouseName}`;
        totals.set(key, (totals.get(key) ?? 0) + allocation.amountAllocated);
      });
    });
    return [...totals.entries()]
      .map(([label, amount]) => ({ label, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 8);
  }, [scopedDonations]);

  const canManageSupporters = user?.roles.includes('Admin') ?? false;
  const canEditSupporter = !historySubject?.isAnonymousAggregate && historySubject?.id && canManageSupporters;

  const resetSupporterForm = () => {
    setEditingSupporterId(null);
    setSupporterErrors({});
    setSupporterForm(defaultSupporterForm);
  };

  const openSupporterEdit = () => {
    if (!canEditSupporter) return;
    const supporter = supporters.find((item) => item.id === Number(historySubject?.id));
    if (!supporter) return;

    setFeedback(null);
    setEditingSupporterId(supporter.id);
    setSupporterErrors({});
    setSupporterForm(createSupporterFormFromRecord(supporter));
  };

  const handleSupporterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !editingSupporterId) return;

    setSubmitting(true);
    setFeedback(null);
    const formErrors = validateSupporterForm(supporterForm);
    setSupporterErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(false);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted supporter fields.' });
      return;
    }

    try {
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
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page-shell donor-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Donor history</span>
          <h1>{historySubject?.displayName ?? 'Supporter history'}</h1>
          <p>
            {historySubject?.isAnonymousAggregate
              ? 'Combined history for anonymous contributions.'
              : 'Every recorded contribution for the selected supporter.'}
          </p>
        </div>
        <div className="section-card-actions">
          <Link className="ghost-button" to="/portal/donors">Back to donors</Link>
        </div>
      </div>

      {feedback && !editingSupporterId ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading supporter history..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : !historySubject ? (
        <EmptyState title="Supporter not found" message="The selected supporter could not be located." />
      ) : (
        <>
          <section className="page-grid three">
            <MetricCard label="Total donated" value={formatMoney(historySubject.lifetimeGiving)} detail="Tracked across all recorded contributions." accent />
            <MetricCard label="Contributions" value={String(historySubject.donationCount)} detail="Donation records attached to this supporter." />
            <MetricCard label="Recurring gifts" value={String(recurringCount)} detail={historySubject.firstDonationDate ? `Since ${formatDate(historySubject.firstDonationDate)}` : 'No first donation date recorded.'} />
          </section>

          <SectionCard
            title="Supporter summary"
            subtitle="Keep the donor profile visible at the top, then review the full contribution history below."
            actions={
              canEditSupporter ? (
                <button className="ghost-button" onClick={openSupporterEdit} type="button">
                  Edit supporter
                </button>
              ) : undefined
            }
          >
            <div className="supporter-profile-stack">
              <SectionCard title="Profile details" subtitle={historySubject.isAnonymousAggregate ? 'Anonymous aggregate profile information remains grouped and partially hidden.' : 'Classification, status, and relationship details for this supporter.'}>
              <DetailList
                items={[
                  { label: 'Type', value: historySubject.supporterType },
                  { label: 'Status', value: historySubject.status },
                  { label: 'Email', value: historySubject.email },
                  { label: 'Phone', value: historySubject.phone },
                  { label: 'Region', value: `${historySubject.region}, ${historySubject.country}` },
                  { label: 'Relationship', value: historySubject.relationshipType },
                  { label: 'Acquisition channel', value: historySubject.acquisitionChannel },
                  { label: 'First donation', value: historySubject.firstDonationDate ? formatDate(historySubject.firstDonationDate) : 'No donation date recorded' },
                ]}
              />
              </SectionCard>
            </div>
          </SectionCard>

          <SectionCard
            title="Donation history"
            subtitle="Review every contribution with more room for campaign, type, and allocation details."
            actions={
              <input
                aria-label="Search donation history"
                className="inline-search donor-history-search"
                placeholder="Search campaign, type, allocation..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            }
          >
            {filteredDonations.length === 0 ? (
              <EmptyState title="No donations found" message="Try clearing the search." />
            ) : (
              <div className="donor-history-table donor-history-table-wide" ref={tableRef}>
                <div className="donor-table-page" key={`${historyPage}-${deferredSearch}`}>
                  <DataTable
                    columns={['Date', 'Amount', 'Campaign', 'Type', 'Primary allocation']}
                    rows={pagedDonations.map((donation) => [
                      formatDate(donation.donationDate),
                      formatMoney(donation.amount ?? donation.estimatedValue),
                      donation.campaignName ?? 'Direct support',
                      humanizeLabel(donation.donationType),
                      donation.allocations[0] ? `${donation.allocations[0].safehouseName} • ${donation.allocations[0].programArea}` : 'No allocation',
                    ])}
                    emptyMessage="No matching records."
                  />
                </div>
                <Pagination
                  page={historyPage}
                  totalPages={totalPages}
                  totalItems={filteredDonations.length}
                  pageSize={PAGE_SIZE}
                  onChange={(page) => {
                    setHistoryPage(page);
                    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Allocation footprint" subtitle="Where this donor’s support has been directed across program areas and safehouses.">
            {allocationBreakdown.length > 0 ? (
              <DataTable
                columns={['Destination', 'Allocated']}
                rows={allocationBreakdown.map((item) => [item.label, formatMoney(item.amount)])}
                emptyMessage="No allocations recorded."
              />
            ) : (
              <EmptyState title="No allocations recorded" message="Allocation details will appear once contributions have been assigned." />
            )}
          </SectionCard>
        </>
      )}

      {canManageSupporters && editingSupporterId ? (
        <div className="modal-backdrop supporter-edit-backdrop" onClick={resetSupporterForm}>
          <div
            aria-labelledby="supporter-profile-edit-title"
            aria-modal="true"
            className="modal-surface donation-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="donation-edit-modal-header">
              <div>
                <h2 id="supporter-profile-edit-title">Edit supporter</h2>
                <p>Update classification, status, and relationship details without leaving the profile page.</p>
              </div>
              <button className="ghost-button" onClick={resetSupporterForm} type="button">
                Close
              </button>
            </div>

            {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

            <SupporterRecordForm
              supporterForm={supporterForm}
              setSupporterForm={setSupporterForm}
              supporterErrors={supporterErrors}
              onSubmit={handleSupporterSubmit}
              onCancel={resetSupporterForm}
              submitting={submitting}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
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
