import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { Donation, DonationImpactPrediction, DonorAllocationBreakdown, DonorImpactSummary } from '../../api/types';
import { useAuth } from '../../hooks/useAuth';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { DetailList } from '../../components/ui/DetailPanel';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { Pagination } from '../../components/ui/Pagination';
import { compareDateStringsDesc, formatDate, formatMoney, normalizeText } from '../../lib/format';

export function DonorHistoryPage() {
  const { user } = useAuth();
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
  const [historyPage, setHistoryPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const PAGE_SIZE = 8;
  const tableRef = useRef<HTMLDivElement>(null);

  const loadDonations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [history, summary, breakdown] = await Promise.all([
        api.donorHistory(),
        api.donorImpactSummary(),
        api.donorAllocationBreakdown(),
      ]);
      setDonations(history);
      setImpactSummary(summary);
      setAllocationBreakdown(breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your giving history.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const estimateImpact = useCallback(async () => {
    if (!user) return;
    const amount = Number(predictionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPrediction(null);
      return;
    }
    setPredicting(true);
    try {
      setPrediction(await api.donorImpactPrediction(amount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate impact.');
    } finally {
      setPredicting(false);
    }
  }, [predictionAmount, user]);

  useEffect(() => { void loadDonations(); }, [loadDonations]);
  useEffect(() => { void estimateImpact(); }, [estimateImpact]);
  useEffect(() => { setHistoryPage(1); }, [deferredSearch]);

  if (!user) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredDonations = donations
    .filter((d) => {
      if (!normalizedSearch) return true;
      return (
        normalizeText(d.supporterName).includes(normalizedSearch) ||
        normalizeText(d.donationType).includes(normalizedSearch) ||
        normalizeText(d.campaignName ?? 'Direct support').includes(normalizedSearch) ||
        normalizeText(d.channelSource).includes(normalizedSearch)
      );
    })
    .sort((a, b) => compareDateStringsDesc(a.donationDate, b.donationDate));

  const totalGiven = donations.reduce((sum, d) => sum + (d.amount ?? d.estimatedValue), 0);
  const recurringCount = donations.filter((d) => d.isRecurring).length;
  const selectedDonation = donations.find((d) => d.id === selectedDonationId) ?? null;

  const totalPages = Math.ceil(filteredDonations.length / PAGE_SIZE);
  const pagedDonations = filteredDonations.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  return (
    <div className="page-shell donor-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Welcome back, {user.fullName.split(' ')[0]}</span>
          <h1>Your giving</h1>
        </div>
        <Link className="primary-button" to="/donate">Donate</Link>
      </div>

      <section className="page-grid three">
        <MetricCard
          label="Total given"
          value={formatMoney(impactSummary?.totalDonated ?? totalGiven)}
          detail={`${impactSummary?.donationCount ?? donations.length} gifts recorded`}
          accent
        />
        <MetricCard
          label="Gifts"
          value={String(impactSummary?.donationCount ?? donations.length)}
          detail="Your full giving history"
        />
        <MetricCard
          label="Monthly gifts"
          value={String(impactSummary?.recurringDonationCount ?? recurringCount)}
          detail={`Avg. ${formatMoney(impactSummary?.averageDonationAmount ?? 0)} per gift`}
        />
      </section>

      <SectionCard
        title="History"
        actions={
          <input
            aria-label="Search donations"
            className="inline-search donor-search"
            placeholder="Campaign or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        {loading ? (
          <LoadingState label="Loading your gifts..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDonations} />
        ) : filteredDonations.length === 0 ? (
          <EmptyState title="No donations found" message="Try clearing the search." />
        ) : (
          <div className="donor-history-table" ref={tableRef}>
            <div className="donor-table-page" key={`${historyPage}-${deferredSearch}`}>
              <DataTable
                columns={['Date', 'Amount', 'Campaign', 'Type']}
                rows={pagedDonations.map((d) => [
                  <button
                    className="table-link-button"
                    key={`r-${d.id}`}
                    onClick={() => setSelectedDonationId(d.id === selectedDonationId ? null : d.id)}
                    type="button"
                  >
                    {formatDate(d.donationDate)}
                  </button>,
                  formatMoney(d.amount ?? d.estimatedValue),
                  d.campaignName ?? 'Direct support',
                  d.donationType,
                ])}
                emptyMessage="No matching records."
              />
            </div>
            <Pagination
              page={historyPage}
              totalPages={totalPages}
              totalItems={filteredDonations.length}
              pageSize={PAGE_SIZE}
              onChange={(p) => {
                setHistoryPage(p);
                tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
            />
          </div>
        )}
      </SectionCard>

      {selectedDonation ? (
        <div className="donor-receipt">
          <div className="donor-receipt-top">
            <h3>Receipt — {formatDate(selectedDonation.donationDate)}</h3>
            <button className="ghost-button" onClick={() => setSelectedDonationId(null)} type="button">
              Close
            </button>
          </div>
          <div className="donor-receipt-body">
            <DetailList
              items={[
                { label: 'Amount', value: formatMoney(selectedDonation.amount ?? selectedDonation.estimatedValue) },
                { label: 'Campaign', value: selectedDonation.campaignName ?? 'Direct support' },
                { label: 'Channel', value: selectedDonation.channelSource },
                { label: 'Type', value: selectedDonation.donationType },
                { label: 'Recurring', value: selectedDonation.isRecurring ? 'Yes' : 'No' },
                { label: 'Currency', value: selectedDonation.currencyCode ?? 'N/A' },
              ]}
            />
            {selectedDonation.allocations.length > 0 ? (
              <div>
                <p className="donor-receipt-alloc-label">Where it went</p>
                <ul className="donor-receipt-alloc-list">
                  {selectedDonation.allocations.map((a) => (
                    <li key={a.id}>
                      <span>{a.safehouseName} — {a.programArea}</span>
                      <strong>{formatMoney(a.amountAllocated)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button className="ghost-button donor-receipt-print" onClick={() => window.print()} type="button">
              Print receipt
            </button>
          </div>
        </div>
      ) : null}

      <section className="page-grid two donor-bottom-grid">
        <SectionCard title="Where it went">
          {allocationBreakdown && allocationBreakdown.items.length > 0 ? (
            <DataTable
              columns={['Program area', 'Amount', 'Share']}
              rows={allocationBreakdown.items.map((item) => [
                item.programArea,
                formatMoney(item.totalAllocated),
                `${item.sharePercent.toFixed(1)}%`,
              ])}
              emptyMessage="No allocations yet."
            />
          ) : (
            <EmptyState title="No allocations yet" message="Appears once your first donation is recorded." />
          )}
        </SectionCard>

        <SectionCard
          title="Estimate impact"
          actions={
            <div className="filter-row">
              <input
                aria-label="Estimate amount"
                className="inline-search"
                min="1"
                step="0.01"
                type="number"
                value={predictionAmount}
                onChange={(e) => setPredictionAmount(e.target.value)}
              />
              <button
                className="primary-button"
                disabled={predicting}
                onClick={() => void estimateImpact()}
                type="button"
              >
                {predicting ? 'Estimating...' : 'Estimate'}
              </button>
            </div>
          }
        >
          {prediction ? (
            <>
              <DataTable
                columns={['Program area', 'Allocated', 'Outcome']}
                rows={prediction.outcomes.map((o) => [
                  o.programArea,
                  formatMoney(o.allocatedAmount),
                  `${o.estimatedUnits.toFixed(1)} ${o.outcomeUnit}`,
                ])}
                emptyMessage="No predictions available."
              />
              <p className="muted-inline">{prediction.assumptions}</p>
            </>
          ) : (
            <EmptyState title="Enter an amount" message="Set a number above and tap Estimate." />
          )}
        </SectionCard>
      </section>
    </div>
  );
}
