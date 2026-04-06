import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { PublicImpactSnapshot } from '../../api/types';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { formatDate } from '../../lib/format';

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

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Public dashboard</span>
          <h1>Impact overview</h1>
          <p>Anonymous, donor-facing reporting pulled from the backend starter API.</p>
        </div>
      </div>

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
