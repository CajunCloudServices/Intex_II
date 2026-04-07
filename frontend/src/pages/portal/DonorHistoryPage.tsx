import { useDeferredValue, useEffect, useState } from 'react';
import { api } from '../../api';
import type { Donation, DonationImpactPrediction, DonorAllocationBreakdown, DonorImpactSummary } from '../../api/types';
import { useAuth } from '../../hooks/useAuth';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';

export function DonorHistoryPage() {
  const { token, user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [impactSummary, setImpactSummary] = useState<DonorImpactSummary | null>(null);
  const [allocationBreakdown, setAllocationBreakdown] = useState<DonorAllocationBreakdown | null>(null);
  const [prediction, setPrediction] = useState<DonationImpactPrediction | null>(null);
  const [predictionAmount, setPredictionAmount] = useState('5000');
  const [predicting, setPredicting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDonationId, setSelectedDonationId] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  const loadDonations = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [history, summary, breakdown] = await Promise.all([
        api.donorHistory(token),
        api.donorImpactSummary(token),
        api.donorAllocationBreakdown(token),
      ]);
      setDonations(history);
      setImpactSummary(summary);
      setAllocationBreakdown(breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donor history.');
    } finally {
      setLoading(false);
    }
  };

  const estimateImpact = async () => {
    if (!token) return;
    const amount = Number(predictionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPrediction(null);
      return;
    }

    setPredicting(true);
    try {
      setPrediction(await api.donorImpactPrediction(token, amount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate donation impact.');
    } finally {
      setPredicting(false);
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

  useEffect(() => {
    void estimateImpact();
  }, [token]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Donor portal</span>
          <h1>My impact dashboard</h1>
          <p>Review your giving history, where allocations were directed, and estimate what your next donation could support.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard
          label="Lifetime giving"
          value={formatMoney(impactSummary?.totalDonated ?? totalGiven)}
          detail="Total recorded across your donor profile."
          accent
        />
        <MetricCard
          label="Contribution count"
          value={String(impactSummary?.donationCount ?? donations.length)}
          detail="Visible donor history rows."
        />
        <MetricCard
          label="Recurring gifts"
          value={String(impactSummary?.recurringDonationCount ?? recurringCount)}
          detail={`Average gift: ${formatMoney(impactSummary?.averageDonationAmount ?? 0)}`}
        />
      </section>

      <section className="page-grid two dashboard-split">
        <SectionCard title="Allocation destinations" subtitle="How your donations have been distributed by safehouse and program area.">
          {allocationBreakdown && allocationBreakdown.items.length > 0 ? (
            <DataTable
              caption="Donor allocation breakdown"
              columns={['Safehouse', 'Program area', 'Allocated total', 'Share']}
              rows={allocationBreakdown.items.map((item) => [
                item.safehouseName,
                item.programArea,
                formatMoney(item.totalAllocated),
                `${item.sharePercent.toFixed(1)}%`,
              ])}
              emptyMessage="No allocation records are available yet."
            />
          ) : (
            <EmptyState title="No allocations yet" message="Allocation details appear once your first donation is recorded." />
          )}
        </SectionCard>

        <SectionCard
          title="Estimate donation outcomes"
          subtitle="Preview what a new donation could enable based on historical allocation mix."
          actions={
            <div className="filter-row">
              <input
                aria-label="Prediction amount"
                className="inline-search"
                min="1"
                step="0.01"
                type="number"
                value={predictionAmount}
                onChange={(event) => setPredictionAmount(event.target.value)}
              />
              <button className="primary-button" disabled={predicting} onClick={() => void estimateImpact()} type="button">
                {predicting ? 'Estimating...' : 'Estimate'}
              </button>
            </div>
          }
        >
          {prediction ? (
            <>
              <DataTable
                caption="Predicted outcomes by program area"
                columns={['Program area', 'Allocated', 'Outcome unit', 'Estimated outcome']}
                rows={prediction.outcomes.map((outcome) => [
                  outcome.programArea,
                  formatMoney(outcome.allocatedAmount),
                  `${outcome.outcomeUnit} @ ${formatMoney(outcome.unitCost)}`,
                  `${outcome.estimatedUnits.toFixed(2)} ${outcome.outcomeUnit}`,
                ])}
                emptyMessage="No prediction outcomes available."
              />
              <p className="muted-inline">{prediction.assumptions}</p>
            </>
          ) : (
            <EmptyState title="Enter a donation amount" message="Set an amount and click Estimate to preview outcomes." />
          )}
        </SectionCard>
      </section>

      <section className="page-grid two dashboard-split">
        <SectionCard
          title="Donation history"
          subtitle="Search your record by campaign, channel, or contribution type. Select a row to view a receipt."
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
              columns={['Date', 'Amount', 'Type', 'Campaign', 'Channel', 'Program areas']}
              rows={filteredDonations.map((donation) => [
                <button
                  className="table-link-button"
                  key={`receipt-${donation.id}`}
                  onClick={() => setSelectedDonationId(donation.id)}
                  type="button"
                >
                  {formatDate(donation.donationDate)}
                </button>,
                formatMoney(donation.amount ?? donation.estimatedValue),
                donation.donationType,
                donation.campaignName ?? 'Direct support',
                donation.channelSource,
                donation.allocations.map((a) => `${a.safehouseName} (${a.programArea})`).join('; '),
              ])}
              emptyMessage="No matching donor records."
            />
          )}
        </SectionCard>

        <DetailPanel
          title={selectedDonationId ? `Donation #${selectedDonationId}` : 'Receipt'}
          subtitle="Select a donation to view receipt details and program allocations."
        >
          {(() => {
            const selected = donations.find((d) => d.id === selectedDonationId) ?? null;
            if (!selected) {
              return <EmptyState title="No donation selected" message="Choose a row from the table to view its receipt." />;
            }
            return (
              <>
                <DetailList
                  items={[
                    { label: 'Date', value: formatDate(selected.donationDate) },
                    { label: 'Amount', value: formatMoney(selected.amount ?? selected.estimatedValue) },
                    { label: 'Currency', value: selected.currencyCode ?? 'N/A' },
                    { label: 'Type', value: selected.donationType },
                    { label: 'Campaign', value: selected.campaignName ?? 'Direct support' },
                    { label: 'Channel', value: selected.channelSource },
                    { label: 'Recurring', value: selected.isRecurring ? 'Yes' : 'No' },
                  ]}
                />
                {selected.allocations.length > 0 ? (
                  <div>
                    <p style={{ margin: '0.75rem 0 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.68)' }}>Impact allocation</p>
                    <ul style={{ margin: 0, paddingLeft: '1rem', display: 'grid', gap: '0.4rem' }}>
                      {selected.allocations.map((a) => (
                        <li key={a.id} style={{ color: 'white', fontSize: '0.95rem' }}>
                          {a.safehouseName} — {a.programArea} ({formatMoney(a.amountAllocated)})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div style={{ marginTop: '0.75rem' }}>
                  <button className="ghost-button" onClick={() => window.print()} type="button" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                    Print receipt
                  </button>
                </div>
              </>
            );
          })()}
        </DetailPanel>
      </section>
    </div>
  );
}
