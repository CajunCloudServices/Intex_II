import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { PublicImpactSnapshot } from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { chartWidthClass } from '../../lib/charts';
import { formatDate, formatMoney } from '../../lib/format';
import impactOverviewImage from '../../assets/generated/impact-overview.webp';

export function ImpactDashboardPage() {
  const [snapshots, setSnapshots] = useState<PublicImpactSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const loadSnapshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.publicImpact();
      setSnapshots(response);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load public impact.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshots();
  }, []);

  const latest = snapshots[0];
  const selectedSnapshot = snapshots[selectedIndex] ?? latest;
  const recentWins = snapshots.slice(0, 3);

  const donationTrend = snapshots
    .map((snapshot) => {
      const metric = snapshot.metrics.find((item) => item.label.toLowerCase().includes('donation'));
      const value = Number((metric?.value ?? '0').replace(/[^\d.]/g, ''));
      return {
        label: formatDate(snapshot.snapshotDate),
        value: Number.isFinite(value) ? value : 0,
      };
    })
    .reverse();
  const maxDonationTrend = Math.max(...donationTrend.map((point) => point.value), 1);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Public dashboard</span>
          <h1>Impact overview</h1>
          <p>Anonymous, donor-facing reporting that summarizes how services, capacity, and support are progressing over time.</p>
        </div>
      </div>

      <section className="editorial-media editorial-media--wide">
        <img
          className="editorial-image"
          src={impactOverviewImage}
          alt="Care resources arranged with intention, including blankets, notebooks, pencils, tea, and a house key."
        />
      </section>

      {loading ? (
        <LoadingState label="Loading public impact snapshots..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSnapshots} />
      ) : selectedSnapshot ? (
        <>
          <SectionCard
            title="Published snapshots"
            subtitle="Use this selector to compare monthly public reports"
            actions={
              <select
                aria-label="Select impact snapshot"
                className="inline-select"
                value={selectedIndex}
                onChange={(event) => setSelectedIndex(Number(event.target.value))}
              >
                {snapshots.map((snapshot, index) => (
                  <option key={snapshot.id} value={index}>
                    {formatDate(snapshot.snapshotDate)} - {snapshot.headline}
                  </option>
                ))}
              </select>
            }
          >
            <p>{selectedSnapshot.summaryText}</p>
          </SectionCard>

          <section className="page-grid four">
            {selectedSnapshot.metrics.map((metric, index) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={index === 0 ? selectedSnapshot.headline : `Snapshot date: ${formatDate(selectedSnapshot.snapshotDate)}`}
                accent={index === 0}
              />
            ))}
          </section>

          <SectionCard title="Recent wins" subtitle="Latest published OKR highlights">
            <div className="chart-list">
              {recentWins.map((snapshot) => (
                <div key={snapshot.id}>
                  <p className="win-headline">{snapshot.headline}</p>
                  <p className="win-subtext muted-inline">
                    {formatDate(snapshot.snapshotDate)} - {snapshot.summaryText}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Monthly donations trend" subtitle="High-level OKR momentum from published impact snapshots">
            <div className="chart-list">
              {donationTrend.map((point) => (
                <div className="chart-row" key={point.label}>
                  <span>{point.label}</span>
                  <div className="chart-bar">
                    <div className={chartWidthClass((point.value / maxDonationTrend) * 100)} />
                  </div>
                  <strong>{formatMoney(point.value)}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={selectedSnapshot.headline} subtitle={formatDate(selectedSnapshot.snapshotDate)}>
            <p>{selectedSnapshot.summaryText}</p>
          </SectionCard>
        </>
      ) : (
        <EmptyState title="No published snapshots" message="The public dashboard will show data once the backend has published impact reports." />
      )}
    </div>
  );
}
