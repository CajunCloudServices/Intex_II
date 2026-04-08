import { useDeferredValue, useEffect, useState } from 'react';
import { api } from '../../api';
import type { AuditEvent } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime, normalizeText } from '../../lib/format';

export function AuditHistoryPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [entityFilter, setEntityFilter] = useState('All');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const loadAuditHistory = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const data = await api.auditLog();
        setEvents(data);
        setSelectedEventId((current) => current ?? data[0]?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit history.');
      } finally {
        setLoading(false);
      }
    };

    void loadAuditHistory();
  }, [user]);

  if (!user) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(event.actorEmail).includes(normalizedSearch) ||
      normalizeText(event.summary).includes(normalizedSearch) ||
      normalizeText(event.entityType).includes(normalizedSearch);
    const matchesAction = actionFilter === 'All' || event.actionType === actionFilter;
    const matchesEntity = entityFilter === 'All' || event.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;
  const createCount = events.filter((event) => event.actionType === 'Create').length;
  const updateCount = events.filter((event) => event.actionType === 'Update').length;
  const deleteCount = events.filter((event) => event.actionType === 'Delete').length;
  const entityTypes = [...new Set(events.map((event) => event.entityType))];

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Security</span>
          <h1>Audit history</h1>
          <p>Review who changed high-sensitivity records, when they changed them, and which entity was affected.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Audit events" value={String(events.length)} detail="Recent tracked create, update, and delete actions." accent />
        <MetricCard label="Create / update" value={`${createCount} / ${updateCount}`} detail="Counts of newly created and modified records." />
        <MetricCard label="Delete actions" value={String(deleteCount)} detail="Deletes are logged separately for review and explanation." />
      </section>

      {loading ? (
        <LoadingState label="Loading audit history..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : events.length === 0 ? (
        <FeedbackBanner tone="info" message="No audit events have been recorded yet." />
      ) : (
        <section className="page-grid two dashboard-split">
          <SectionCard
            title="Audit events"
            subtitle="Track high-sensitivity admin mutations across care, donations, and operational records."
            actions={
              <div className="filter-row">
                <input
                  aria-label="Search audit events"
                  className="inline-search"
                  placeholder="Search actor or summary..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select className="inline-select" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                  <option>All</option>
                  <option>Create</option>
                  <option>Update</option>
                  <option>Delete</option>
                </select>
                <select className="inline-select" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
                  <option>All</option>
                  {entityTypes.map((entity) => (
                    <option key={entity}>{entity}</option>
                  ))}
                </select>
              </div>
            }
          >
            <DataTable
              columns={['When', 'Action', 'Entity', 'Actor', 'Summary']}
              rows={filteredEvents.map((event) => [
                formatDateTime(event.createdAtUtc),
                <StatusBadge key={`action-${event.id}`} value={event.actionType} />,
                event.entityType,
                event.actorEmail,
                <>
                  <button className="table-link-button" onClick={() => setSelectedEventId(event.id)} type="button">
                    View
                  </button>{' '}
                  {event.summary}
                </>,
              ])}
              emptyMessage="No audit events match the current filters."
              caption="Recent audit events"
            />
          </SectionCard>

          <DetailPanel
            title={selectedEvent ? `${selectedEvent.actionType} ${selectedEvent.entityType}` : 'Select an audit event'}
            subtitle={selectedEvent ? 'Audit entries show who performed a sensitive action and what record changed.' : 'Pick an entry from the table to inspect it.'}
          >
            {selectedEvent ? (
              <DetailList
                items={[
                  { label: 'Timestamp', value: formatDateTime(selectedEvent.createdAtUtc) },
                  { label: 'Action', value: selectedEvent.actionType },
                  { label: 'Entity type', value: selectedEvent.entityType },
                  { label: 'Entity id', value: selectedEvent.entityId },
                  { label: 'Actor', value: selectedEvent.actorEmail },
                  { label: 'Actor user id', value: selectedEvent.actorUserId ?? 'Unavailable' },
                  { label: 'Summary', value: selectedEvent.summary },
                ]}
              />
            ) : (
              <p className="home-muted">Select an event from the table to inspect the full audit details.</p>
            )}
          </DetailPanel>
        </section>
      )}
    </div>
  );
}
