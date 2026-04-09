import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import type { Donation, Supporter } from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { DetailList } from '../../components/ui/DetailPanel';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';

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
  const [search, setSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
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
    setHistoryPage(1);
  }, [deferredSearch]);

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
        .sort((left, right) => new Date(right.donationDate).getTime() - new Date(left.donationDate).getTime()),
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

          <section className="page-grid two donor-workspace-grid">
            <SectionCard
              title="Donation history"
              subtitle="Review every contribution without crowding the main donor dashboard."
              actions={
                <input
                  aria-label="Search donation history"
                  className="inline-search"
                  placeholder="Search campaign, type, allocation..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              }
            >
              {filteredDonations.length === 0 ? (
                <EmptyState title="No donations found" message="Try clearing the search." />
              ) : (
                <div className="donor-history-table" ref={tableRef}>
                  <div className="donor-table-page" key={`${historyPage}-${deferredSearch}`}>
                    <DataTable
                      columns={['Date', 'Amount', 'Campaign', 'Type', 'Allocation']}
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

            <SectionCard title="Supporter summary" subtitle="Keep the donor overview compact while leaving the detailed history on this page.">
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
          </section>

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
