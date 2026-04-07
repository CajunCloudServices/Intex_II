import { useDeferredValue, useEffect, useState } from 'react';
import { api } from '../../api';
import type { Donation } from '../../api/types';
import { useAuth } from '../../hooks/useAuth';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';

export function DonorHistoryPage() {
  const { token, user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const loadDonations = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      setDonations(await api.donorHistory(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donor history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDonations();
  }, [token]);

  if (!user || !token) {
    return null;
  }

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredDonations = donations.filter((donation) => {
    if (!normalizedSearch) return true;

    return (
      normalizeText(donation.supporterName).includes(normalizedSearch) ||
      normalizeText(donation.donationType).includes(normalizedSearch) ||
      normalizeText(donation.campaignName ?? '').includes(normalizedSearch) ||
      normalizeText(donation.channelSource).includes(normalizedSearch)
    );
  });

  const totalGiven = donations.reduce((sum, donation) => sum + (donation.amount ?? donation.estimatedValue), 0);
  const recurringCount = donations.filter((donation) => donation.isRecurring).length;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Donor portal</span>
          <h1>My contributions</h1>
          <p>Review your giving history, campaign records, and the program areas your contributions support.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Lifetime giving" value={formatMoney(totalGiven)} detail="Total recorded across your available donation history." accent />
        <MetricCard label="Contribution count" value={String(donations.length)} detail="Visible donor history rows." />
        <MetricCard label="Recurring gifts" value={String(recurringCount)} detail="Monthly commitments flagged in the data." />
      </section>

      <SectionCard
        title="Donation history"
        subtitle="Search the donor's own record by campaign, channel, or contribution type"
        actions={
          <input
            aria-label="Search donor history"
            className="inline-search"
            placeholder="Search contributions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {loading ? (
          <LoadingState label="Loading donor history..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDonations} />
        ) : filteredDonations.length === 0 ? (
          <EmptyState title="No matching contributions" message="Try another search term or clear the filter." />
        ) : (
          <DataTable
            caption="Donor-facing contribution history"
            columns={['Date', 'Amount', 'Type', 'Campaign', 'Channel', 'Allocations']}
            rows={filteredDonations.map((donation) => [
              formatDate(donation.donationDate),
              formatMoney(donation.amount ?? donation.estimatedValue),
              donation.donationType,
              donation.campaignName ?? 'Direct support',
              donation.channelSource,
              donation.allocations.map((allocation) => `${allocation.safehouseName} (${allocation.programArea})`).join('; '),
            ])}
            emptyMessage="No matching donor records."
          />
        )}
      </SectionCard>
    </div>
  );
}
