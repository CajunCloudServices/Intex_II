import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type {
  PublicImpactCapacityRow,
  PublicImpactDashboard,
} from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { formatCompactMoney } from '../../lib/format';

function formatMonthYear(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits,
  }).format(value / 100);
}

function formatScore(value: number) {
  return `${value.toFixed(1)} / 5`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatWholeMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function summarizeCapacity(capacityRows: PublicImpactCapacityRow[]) {
  return capacityRows.map((row) => ({
    ...row,
    occupancyPercent: row.capacityGirls > 0 ? (row.currentOccupancy / row.capacityGirls) * 100 : 0,
  }));
}

export function ImpactDashboardPage() {
  const [dashboard, setDashboard] = useState<PublicImpactDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(null);
  const [capacityPage, setCapacityPage] = useState(0);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.publicImpact();
      setDashboard(response);
      const latestValid = response.snapshots.find((snapshot) => snapshot.isDisplayValid) ?? response.snapshots[0] ?? null;
      setSelectedSnapshotId(latestValid?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load public impact.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    setCapacityPage(0);
  }, [selectedSnapshotId]);

  const validSnapshots = useMemo(
    () => (dashboard?.snapshots ?? []).filter((snapshot) => snapshot.isDisplayValid),
    [dashboard],
  );

  const selectedSnapshot = useMemo(
    () => validSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? validSnapshots[0] ?? null,
    [selectedSnapshotId, validSnapshots],
  );

  const selectedSnapshotIndex = useMemo(
    () => validSnapshots.findIndex((snapshot) => snapshot.id === selectedSnapshot?.id),
    [selectedSnapshot, validSnapshots],
  );

  const trendSnapshots = useMemo(() => {
    if (!selectedSnapshot || selectedSnapshotIndex < 0) {
      return [];
    }

    const moreRecent = validSnapshots.slice(Math.max(0, selectedSnapshotIndex - 3), selectedSnapshotIndex);
    const previous = validSnapshots.slice(selectedSnapshotIndex + 1, selectedSnapshotIndex + 4);
    return [...moreRecent, selectedSnapshot, ...previous];
  }, [selectedSnapshot, selectedSnapshotIndex, validSnapshots]);
  const resourceUseItems = useMemo(() => dashboard?.resourceUse ?? [], [dashboard]);
  const capacityRows = useMemo(() => summarizeCapacity(dashboard?.capacityRows ?? []), [dashboard]);
  const displayedSupportTotal = useMemo(
    () => resourceUseItems.reduce((sum, item) => sum + item.amountAllocated, 0),
    [resourceUseItems],
  );
  const capacityPageSize = 4;
  const totalCapacityPages = Math.max(1, Math.ceil(capacityRows.length / capacityPageSize));
  const visibleCapacityRows = useMemo(() => {
    const safePage = Math.min(capacityPage, Math.max(0, totalCapacityPages - 1));
    const startIndex = safePage * capacityPageSize;
    return capacityRows.slice(startIndex, startIndex + capacityPageSize);
  }, [capacityPage, capacityRows, totalCapacityPages]);

  const latestResidents = selectedSnapshot?.totalResidents ?? 0;
  const latestEducationProgress = selectedSnapshot?.avgEducationProgress ?? 0;
  const latestHealthScore = selectedSnapshot?.avgHealthScore ?? 0;
  const selectedHomeVisits = selectedSnapshot?.homeVisitsThisMonth ?? 0;
  const selectedMonthLabel = selectedSnapshot ? formatMonthYear(selectedSnapshot.snapshotDate) : 'selected month';

  return (
    <div className="page-shell impact-dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Public dashboard</span>
          <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>Our Impact</h1>
        </div>
      </div>

      <section className="impact-transparency-note" aria-label="Transparency note">
        <strong>All figures are aggregated to protect resident privacy.</strong>
      </section>

      {loading ? (
        <LoadingState label="Loading public impact dashboard..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : selectedSnapshot && dashboard ? (
        <>
          <section className="impact-overall-shell" aria-label="Overall impact">
            <div className="impact-overall-header">
              <div>
                <h2>Overall</h2>
              </div>
            </div>

            <section className="page-grid four impact-summary-grid impact-overall-grid">
              <MetricCard
                label="Total tracked support"
                value={formatWholeMoney(dashboard.overallSummary.totalTrackedSupport)}
                detail="Combined donor allocations recorded across the public dashboard."
                accent
              />
              <MetricCard
                label="Total home visits recorded"
                value={String(dashboard.overallSummary.totalHomeVisitsRecorded)}
                detail="Aggregated across all recorded operational months in the database."
              />
              <MetricCard
                label="Homes represented"
                value={String(dashboard.overallSummary.safehouseCount)}
                detail="Safehouses currently included in Tanglaw's public reporting view."
              />
              <MetricCard
                label="Published reporting months"
                value={String(dashboard.overallSummary.publishedReportingMonths)}
                detail={`Current network occupancy: ${dashboard.overallSummary.currentOccupancy} / ${dashboard.overallSummary.totalCapacity}`}
              />
            </section>
          </section>
          
          <section className="impact-monthly-shell" aria-label="Monthly reporting">
            <div className="impact-monthly-header">
              <div className="impact-monthly-copy">
                <h2>Monthly</h2>
                <div className="impact-selection-summary">
                  <strong>{selectedMonthLabel}</strong>
                </div>
              </div>
            </div>

            <section className="page-grid four impact-summary-grid">
              <MetricCard
                label="Residents in reporting snapshot"
                value={String(latestResidents)}
                detail={`Reported for ${formatMonthYear(selectedSnapshot.snapshotDate)}`}
                accent
              />
              <MetricCard
                label="Average education progress"
                value={formatPercent(latestEducationProgress, 1)}
                detail="Aggregate monthly progress across anonymized education records."
              />
              <MetricCard
                label="Average wellbeing score"
                value={formatScore(latestHealthScore)}
                detail="A high-level wellbeing signal from anonymized monthly reporting."
              />
              <MetricCard
                label="Home visits this month"
                value={String(selectedHomeVisits)}
                detail={`Operational activity for ${selectedMonthLabel}`}
              />
            </section>

            <SectionCard
              title="Reporting history"
              subtitle={`Recent valid months ending ${selectedMonthLabel}`}
              actions={
                <div className="impact-history-filter">
                  <label className="impact-page-toolbar-label" htmlFor="impact-reporting-month">
                    Reporting month
                  </label>
                  <select
                    id="impact-reporting-month"
                    aria-label="Select reporting month"
                    className="inline-select"
                    value={selectedSnapshot.id}
                    onChange={(event) => setSelectedSnapshotId(Number(event.target.value))}
                  >
                    {validSnapshots.map((snapshot) => (
                      <option key={snapshot.id} value={snapshot.id}>
                        {formatMonthYear(snapshot.snapshotDate)}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <p className="impact-history-helper">
                The selected month is highlighted in the middle so you can compare it with the three more recent valid months above and the three earlier months below.
              </p>
              <div className="impact-history-table" role="table" aria-label="Recent reporting history">
                <div className="impact-history-header" role="row">
                  <span role="columnheader">Month</span>
                  <span role="columnheader">Residents served</span>
                  <span role="columnheader">Education progress</span>
                  <span role="columnheader">Wellbeing score</span>
                  <span role="columnheader">Home visits</span>
                </div>
                {trendSnapshots.map((snapshot) => {
                  const isSelected = snapshot.id === selectedSnapshot.id;
                  return (
                    <div className={`impact-history-row${isSelected ? ' impact-history-row-selected' : ''}`} key={snapshot.id} role="row">
                      <strong role="cell">{formatMonthYear(snapshot.snapshotDate)}</strong>
                      <span role="cell">{snapshot.totalResidents ?? 0}</span>
                      <span role="cell">{formatPercent(snapshot.avgEducationProgress ?? 0, 1)}</span>
                      <span role="cell">{formatScore(snapshot.avgHealthScore ?? 0)}</span>
                      <span role="cell">{snapshot.homeVisitsThisMonth}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </section>

          <section className="impact-static-shell" aria-label="Support and capacity">
            <div className="impact-static-header">
              <h2>Support and Capacity</h2>
            </div>
          </section>

          <section className="impact-detail-grid" aria-label="Support allocation and capacity overview">
            <div className="impact-detail-panel">
              <SectionCard
                title="Where support goes"
                subtitle="Tracked donor allocations by program area"
                actions={
                  <div className="impact-support-total">
                    <span>Total tracked support</span>
                    <strong>{formatWholeMoney(displayedSupportTotal)}</strong>
                  </div>
                }
              >
                <div className="chart-list impact-support-chart-list">
                  {resourceUseItems.map((item) => {
                    const relativePercent =
                      displayedSupportTotal > 0 ? (item.amountAllocated / displayedSupportTotal) * 100 : item.sharePercent;

                    return (
                      <div className="chart-row impact-resource-row" key={item.programArea}>
                        <span>{item.programArea}</span>
                        <div className="chart-bar">
                          <div className="chart-fill" style={{ width: `${clampPercent(relativePercent)}%` }} />
                        </div>
                        <div className="impact-resource-meta">
                          <strong>{formatCompactMoney(item.amountAllocated)}</strong>
                          <span>{formatPercent(relativePercent, 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>

            <div className="impact-detail-panel">
              <SectionCard
                title="Capacity and care"
                subtitle="Current occupancy plus care activity tied to the selected reporting month"
                actions={
                  totalCapacityPages > 1 ? (
                    <div className="impact-pagination" aria-label="Capacity pagination">
                      <button
                        type="button"
                        className="impact-page-button"
                        onClick={() => setCapacityPage((page) => Math.max(0, page - 1))}
                        disabled={capacityPage === 0}
                      >
                        Previous
                      </button>
                      <span>
                        {capacityPage + 1} / {totalCapacityPages}
                      </span>
                      <button
                        type="button"
                        className="impact-page-button"
                        onClick={() => setCapacityPage((page) => Math.min(totalCapacityPages - 1, page + 1))}
                        disabled={capacityPage >= totalCapacityPages - 1}
                      >
                        Next
                      </button>
                    </div>
                  ) : null
                }
              >
                <div className="impact-capacity-summary">
                  <div>
                    <span className="impact-capacity-kicker">Network occupancy</span>
                    <strong>
                      {dashboard.summary.totalOccupancy} / {dashboard.summary.totalCapacity}
                    </strong>
                    <p>{dashboard.summary.safehouseCount} homes are represented in this public summary.</p>
                  </div>
                  <div>
                    <span className="impact-capacity-kicker">Home visits in {selectedMonthLabel}</span>
                    <strong>{selectedHomeVisits}</strong>
                    <p>Aggregated from the selected month so this section matches the rest of the page.</p>
                  </div>
                </div>

                <div className="impact-capacity-list">
                  {visibleCapacityRows.map((row) => (
                    <div className="impact-capacity-row" key={row.safehouseName}>
                      <div className="impact-capacity-row-top">
                        <span>{row.safehouseName}</span>
                        <strong>
                          {row.currentOccupancy}/{row.capacityGirls}
                        </strong>
                      </div>
                      <div className="chart-bar">
                        <div className="chart-fill" style={{ width: `${clampPercent(row.occupancyPercent)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title="No published public metrics"
          message="The public dashboard will appear once valid anonymized reporting snapshots are available."
        />
      )}
    </div>
  );
}
