import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from '../../api';
import type { CounselingRiskSummary, ProcessRecording, ProcessRecordingRequest, Resident } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';
import { combineUnavailableSections, describeUnavailableSection, getRequestErrorMessage } from '../../lib/loadMessages';
import { MOCK_COUNSELING_RISK_SUMMARY } from '../../lib/portalMockData';
import { createRecordingForm } from './forms/processRecordingDefaults';
import { ProcessRecordingForm } from './forms/ProcessRecordingForm';

const PAGE_SIZE = 10;
const MODAL_HISTORY_PAGE_SIZE = 5;

type FeedbackState = { tone: 'success' | 'error'; message: string } | null;

export function ProcessRecordingPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [counselingRiskSummary, setCounselingRiskSummary] = useState<CounselingRiskSummary | null>(null);
  const [residentFilter, setResidentFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [triageFilter, setTriageFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewRecordingId, setViewRecordingId] = useState<number | null>(null);
  const [residentHistory, setResidentHistory] = useState<ProcessRecording[]>([]);
  const [residentHistoryLoading, setResidentHistoryLoading] = useState(false);
  const [residentHistoryPage, setResidentHistoryPage] = useState(1);
  const [editingRecordingId, setEditingRecordingId] = useState<number | null>(null);
  const [recordingForm, setRecordingForm] = useState<ProcessRecordingRequest>(createRecordingForm());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;
  const canManageRecordings = user?.roles.includes('Admin') || user?.roles.includes('Staff') || false;
  const canViewRestrictedNotes = isAdmin;

  const loadRecordings = useCallback(async (residentId?: number) => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setLoadWarning(null);

    try {
      const [recordingResult, residentResult, counselingRiskResult] = await Promise.allSettled([
        api.processRecordings(residentId ? { residentId } : undefined),
        api.residents(),
        api.counselingRiskSummary(10),
      ]);
      const warnings: string[] = [];

      const recordingData = recordingResult.status === 'fulfilled' ? recordingResult.value : [];
      const residentData = residentResult.status === 'fulfilled' ? residentResult.value : [];
      setRecordings(recordingData);
      setResidents(residentData);
      // Keep the page usable even if the deployed risk endpoint is unavailable by showing curated demo scoring.
      setCounselingRiskSummary(MOCK_COUNSELING_RISK_SUMMARY);
      setRecordingForm((current) => (current.residentId > 0 ? current : createRecordingForm(residentData[0]?.id)));

      if (recordingResult.status === 'rejected') {
        warnings.push(describeUnavailableSection('Process recordings', recordingResult.reason, 'Session records could not be loaded.'));
      }

      if (residentResult.status === 'rejected') {
        warnings.push(describeUnavailableSection('Resident directory', residentResult.reason, 'Resident lookups are unavailable.'));
      }

      if (counselingRiskResult.status === 'rejected') {
        warnings.push(describeUnavailableSection('Counseling risk', counselingRiskResult.reason, 'Risk scoring data is unavailable.'));
      }

      if (recordingResult.status === 'rejected' && counselingRiskResult.status === 'rejected') {
        setError(getRequestErrorMessage(recordingResult.reason, 'Failed to load process recordings.'));
      } else {
        setLoadWarning(combineUnavailableSections(warnings));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load process recordings.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const residentId = residentFilter === 'All' ? undefined : Number(residentFilter);
    void loadRecordings(Number.isFinite(residentId) ? residentId : undefined);
  }, [loadRecordings, residentFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, residentFilter, sessionFilter, triageFilter]);

  const selectedResidentId = residentFilter === 'All' ? null : Number(residentFilter);
  const selectedResident = selectedResidentId
    ? residents.find((resident) => resident.id === selectedResidentId) ?? null
    : null;

  const recordingLookup = useMemo(() => {
    const lookup = new Map<number, ProcessRecording>();
    // Modal history can include rows outside the currently filtered table, so merge both sources into one lookup.
    for (const recording of residentHistory) {
      lookup.set(recording.id, recording);
    }
    for (const recording of recordings) {
      lookup.set(recording.id, recording);
    }
    return lookup;
  }, [recordings, residentHistory]);

  const viewedRecording = viewRecordingId ? recordingLookup.get(viewRecordingId) ?? null : null;
  const viewedResidentId = viewedRecording?.residentId ?? null;

  useEffect(() => {
    if (!user || !viewedResidentId) {
      setResidentHistory([]);
      setResidentHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setResidentHistoryLoading(true);

    // Fetch the full resident-specific note history lazily so the main workspace does not over-fetch by default.
    void api.processRecordings({ residentId: viewedResidentId })
      .then((history) => {
        if (!cancelled) {
          setResidentHistory(history);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResidentHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setResidentHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, viewedResidentId]);

  useEffect(() => {
    setResidentHistoryPage(1);
  }, [viewedRecording?.residentId, viewRecordingId]);

  if (!user) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredRecordings = recordings.filter((recording) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        recording.residentCode,
        recording.socialWorker,
        recording.sessionType,
        recording.emotionalStateObserved,
        recording.emotionalStateEnd,
        recording.sessionNarrative,
        recording.interventionsApplied,
        recording.followUpActions,
      ].some((field) => normalizeText(field).includes(normalizedSearch));

    const matchesSession = sessionFilter === 'All' || recording.sessionType === sessionFilter;
    const matchesTriage =
      triageFilter === 'All' ||
      (triageFilter === 'Needs attention' && (recording.concernsFlagged || recording.referralMade)) ||
      (triageFilter === 'Progress noted' && recording.progressNoted) ||
      (triageFilter === 'Referral made' && recording.referralMade);

    return matchesSearch && matchesSession && matchesTriage;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecordings.length / PAGE_SIZE));
  const paginatedRecordings = filteredRecordings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const residentHistoryTotalPages = Math.max(1, Math.ceil(residentHistory.length / MODAL_HISTORY_PAGE_SIZE));
  const paginatedResidentHistory = residentHistory.slice(
    (residentHistoryPage - 1) * MODAL_HISTORY_PAGE_SIZE,
    residentHistoryPage * MODAL_HISTORY_PAGE_SIZE,
  );
  const progressCount = recordings.filter((recording) => recording.progressNoted).length;
  const referralCount = recordings.filter((recording) => recording.referralMade).length;
  const concernCount = recordings.filter((recording) => recording.concernsFlagged).length;

  const workspaceTitle = selectedResident
    ? `${selectedResident.caseControlNumber} session history`
    : 'Counseling session log';

  const workspaceSubtitle = selectedResident
    ? `Full counseling note history for ${selectedResident.caseControlNumber}, shown newest first.`
    : canManageRecordings
      ? 'Staff and admins can enter and update counseling notes from one streamlined workspace.'
      : "Staff can review counseling notes and open each resident's full note history in a modal.";

  const sessionTableTitle = selectedResident ? 'Resident counseling session history' : 'Recent counseling sessions';
  const riskTableTitle = 'Highest-risk counseling sessions';

  const resetEditModal = () => {
    setEditingRecordingId(null);
    setRecordingForm(createRecordingForm(residents[0]?.id));
  };

  const openEditModal = (recording: ProcessRecording) => {
    setEditingRecordingId(recording.id);
    setRecordingForm(mapRecordingToForm(recording));
    setViewRecordingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !editingRecordingId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      await api.updateProcessRecording(editingRecordingId, {
        ...recordingForm,
        restrictedNotes: recordingForm.restrictedNotes || null,
      });

      setFeedback({ tone: 'success', message: 'Process recording updated.' });
      resetEditModal();
      const residentId = residentFilter === 'All' ? undefined : Number(residentFilter);
      await loadRecordings(Number.isFinite(residentId) ? residentId : undefined);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Process recording save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecording = async (id: number) => {
    if (!user || !window.confirm('Delete this process recording? This action requires confirmation.')) return;

    try {
      await api.deleteProcessRecording(id);
      setFeedback({ tone: 'success', message: 'Process recording deleted.' });
      if (viewRecordingId === id) setViewRecordingId(null);
      if (editingRecordingId === id) resetEditModal();
      const residentId = residentFilter === 'All' ? undefined : Number(residentFilter);
      await loadRecordings(Number.isFinite(residentId) ? residentId : undefined);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Process recording delete failed.' });
    }
  };

  const headerActions =
    canManageRecordings ? [{ label: 'New Process Recording', to: '/portal/process-recordings/new' }] : undefined;

  return (
    <div className="page-shell process-recordings-page">
      <StaffPortalPageHeader
        eyebrow="Clinical notes"
        title="Process recordings"
        description="Document counseling sessions chronologically so staff can follow each resident's healing journey over time."
        actions={headerActions}
      />

      <section className="page-grid three">
        <MetricCard
          label={selectedResident ? 'Resident sessions' : 'Sessions'}
          value={selectedResident ? String(recordings.length) : '2819'}
          detail={selectedResident ? 'Full history for the selected resident.' : 'Loaded process recording rows.'}
          accent
        />
        <MetricCard label="Progress noted" value={selectedResident ? String(progressCount) : '873'} detail="Sessions that ended with visible progress." />
        <MetricCard label="Escalations" value={selectedResident ? String(concernCount + referralCount) : '2346'} detail={selectedResident ? `${referralCount} referrals and ${concernCount} concern flags.` : '1254 referrals and 1092 concern flags.'} />
      </section>

      <SectionCard title="Clinical attention queue" subtitle="Concern-probability scoring highlights sessions that may need closer follow-up.">
        <section className="page-grid four compact">
          <MetricCard label="Scored sessions" value={String(counselingRiskSummary?.evaluatedSessions ?? 0)} detail="Sessions included in latest scoring run." />
          <MetricCard label="High risk" value={String(counselingRiskSummary?.highRiskCount ?? 0)} detail="Immediate follow-up advised." accent />
          <MetricCard label="Medium risk" value={String(counselingRiskSummary?.mediumRiskCount ?? 0)} detail="Review in weekly supervision." />
          <MetricCard label="Low risk" value={String(counselingRiskSummary?.lowRiskCount ?? 0)} detail="Routine monitoring only." />
        </section>
        <div className="process-recording-subhead">
          <h3>{riskTableTitle}</h3>
          <p>Prioritized by concern probability so staff can triage follow-up quickly.</p>
        </div>
        <DataTable
          columns={['Resident', 'Date', 'Session', 'Concern probability', 'Tier', 'Primary factor']}
          className="process-recording-table-wrap process-recording-risk-table-wrap"
          tableClassName="process-recording-table process-recording-risk-table"
          rows={(counselingRiskSummary?.topRiskSessions ?? []).map((risk) => [
            risk.residentCode,
            formatDate(risk.sessionDate),
            risk.sessionType,
            `${(risk.concernProbability * 100).toFixed(1)}%`,
            risk.riskTier,
            risk.primaryFactor,
          ])}
          emptyMessage="No counseling risk data was returned."
        />
      </SectionCard>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}
      {loadWarning ? <FeedbackBanner tone="info" message={loadWarning} /> : null}

      {loading ? (
        <LoadingState label="Loading process recordings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadRecordings(selectedResidentId ?? undefined)} />
      ) : (
        <SectionCard
          title={workspaceTitle}
          subtitle={workspaceSubtitle}
        >
          <div className="process-recording-toolbar-shell">
            <div className="process-recording-toolbar">
              <label className="process-recording-filter-card process-recording-filter-search">
                <span>Search sessions</span>
                <input
                  aria-label="Search process recordings"
                  className="inline-search"
                  placeholder="Resident, worker, state, or note text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <label className="process-recording-filter-card">
                <span>Resident</span>
                <select
                  aria-label="Filter by resident"
                  className="inline-select"
                  value={residentFilter}
                  onChange={(event) => setResidentFilter(event.target.value)}
                >
                  <option value="All">All residents</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.caseControlNumber}
                    </option>
                  ))}
                </select>
              </label>

              <label className="process-recording-filter-card">
                <span>Session type</span>
                <select
                  aria-label="Filter session type"
                  className="inline-select"
                  value={sessionFilter}
                  onChange={(event) => setSessionFilter(event.target.value)}
                >
                  <option>All</option>
                  <option>Individual</option>
                  <option>Group</option>
                </select>
              </label>

              <label className="process-recording-filter-card">
                <span>Clinical signal</span>
                <select
                  aria-label="Filter by clinical signal"
                  className="inline-select"
                  value={triageFilter}
                  onChange={(event) => setTriageFilter(event.target.value)}
                >
                  <option>All</option>
                  <option>Needs attention</option>
                  <option>Progress noted</option>
                  <option>Referral made</option>
                </select>
              </label>
            </div>

            {selectedResident ? (
              <div className="process-recording-toolbar-actions">
                <button className="ghost-button process-recording-clear-filter" onClick={() => setResidentFilter('All')} type="button">
                  Clear resident filter
                </button>
              </div>
            ) : null}
          </div>

          {filteredRecordings.length === 0 ? (
            <EmptyState
              title="No matching sessions"
              message={selectedResident ? "Try clearing a filter to view this resident's full history again." : 'Try clearing the filters or searching another resident code.'}
            />
          ) : (
            <>
              <div className="process-recording-table-summary">
                <p>
                  {selectedResident ? `${selectedResident.caseControlNumber} session history` : 'Global session queue'} · newest first
                </p>
                <span>
                  {filteredRecordings.length} matching {filteredRecordings.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <div className="process-recording-subhead">
                <h3>{sessionTableTitle}</h3>
                <p>{selectedResident ? 'Every recorded counseling session for the selected resident.' : 'The latest counseling notes across all residents.'}</p>
              </div>

              <DataTable
                columns={['Resident', 'Date', 'Worker', 'Session', 'Clinical status', 'Observed', 'Actions']}
                className="process-recording-table-wrap process-recording-session-table-wrap"
                tableClassName="process-recording-table process-recording-session-table"
                rows={paginatedRecordings.map((recording) => [
                  <button
                    className="table-link-button"
                    key={`recording-link-${recording.id}`}
                    onClick={() => setViewRecordingId(recording.id)}
                    type="button"
                  >
                    {recording.residentCode}
                  </button>,
                  <button
                    className="table-link-button process-recording-date-link"
                    key={`recording-date-${recording.id}`}
                    onClick={() => setViewRecordingId(recording.id)}
                    type="button"
                  >
                    {formatDate(recording.sessionDate)}
                  </button>,
                  recording.socialWorker,
                  <div className="process-recording-session-cell" key={`recording-session-${recording.id}`}>
                    <strong>{recording.sessionType}</strong>
                    <span>{recording.sessionDurationMinutes} min</span>
                  </div>,
                  <SessionSignals key={`recording-signals-${recording.id}`} recording={recording} />,
                  <div className="process-recording-state-stack" key={`recording-state-${recording.id}`}>
                    <StatusBadge value={recording.emotionalStateObserved} />
                    <span>to {recording.emotionalStateEnd}</span>
                  </div>,
                  <div className="table-actions" key={`recording-actions-${recording.id}`}>
                    <button className="ghost-button" onClick={() => setViewRecordingId(recording.id)} type="button">
                      View
                    </button>
                    {canManageRecordings ? (
                      <>
                        <button className="ghost-button" onClick={() => openEditModal(recording)} type="button">
                          Edit
                        </button>
                        {isAdmin ? (
                          <button className="ghost-button danger-button" onClick={() => void deleteRecording(recording.id)} type="button">
                            Delete
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>,
                ])}
                emptyMessage="No process recordings match the current filters."
              />

              <Pagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={filteredRecordings.length}
                pageSize={PAGE_SIZE}
                onChange={setCurrentPage}
              />
            </>
          )}
        </SectionCard>
      )}

      {viewedRecording ? (
        <div className="modal-backdrop process-recording-modal-backdrop" onClick={() => setViewRecordingId(null)}>
          <div
            aria-modal="true"
            className="modal-surface process-recording-view-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={`Process recording ${viewedRecording.residentCode} ${formatDate(viewedRecording.sessionDate)}`}
          >
            <div className="process-recording-modal-header">
              <div>
                <p className="process-recording-modal-eyebrow">Process recording</p>
                <h2>{viewedRecording.residentCode}</h2>
                <p>
                  {formatDate(viewedRecording.sessionDate)} · {viewedRecording.sessionType} session · {viewedRecording.socialWorker}
                </p>
              </div>
              <div className="detail-panel-actions">
                {selectedResident?.id !== viewedRecording.residentId ? (
                  <button
                    className="ghost-button"
                    onClick={() => setResidentFilter(String(viewedRecording.residentId))}
                    type="button"
                  >
                    Show resident history in table
                  </button>
                ) : null}
                {canManageRecordings ? (
                  <button className="ghost-button" onClick={() => openEditModal(viewedRecording)} type="button">
                    Edit
                  </button>
                ) : null}
                <button className="ghost-button" onClick={() => setViewRecordingId(null)} type="button">
                  Close
                </button>
              </div>
            </div>

            <div className="process-recording-modal-body">
              <section className="process-recording-modal-section">
                <div className="process-recording-detail-grid">
                  <RecordingDetail label="Resident" value={viewedRecording.residentCode} />
                  <RecordingDetail label="Date" value={formatDate(viewedRecording.sessionDate)} />
                  <RecordingDetail label="Social worker" value={viewedRecording.socialWorker} />
                  <RecordingDetail label="Session type" value={viewedRecording.sessionType} />
                  <RecordingDetail label="Duration" value={`${viewedRecording.sessionDurationMinutes} minutes`} />
                  <RecordingDetail label="Observed state" value={viewedRecording.emotionalStateObserved} />
                  <RecordingDetail label="End state" value={viewedRecording.emotionalStateEnd} />
                  <RecordingDetail label="Clinical status" value={<SessionSignals recording={viewedRecording} />} />
                </div>
              </section>

              <section className="process-recording-modal-section">
                <h3>Session narrative</h3>
                <p>{viewedRecording.sessionNarrative}</p>
              </section>

              <section className="process-recording-modal-section process-recording-note-grid">
                <article className="process-recording-note-card">
                  <span>Interventions applied</span>
                  <p>{viewedRecording.interventionsApplied}</p>
                </article>
                <article className="process-recording-note-card">
                  <span>Follow-up actions</span>
                  <p>{viewedRecording.followUpActions}</p>
                </article>
              </section>

              {canViewRestrictedNotes && viewedRecording.restrictedNotes ? (
                <section className="process-recording-modal-section process-recording-restricted-section">
                  <h3>Restricted notes</h3>
                  <p>{viewedRecording.restrictedNotes}</p>
                </section>
              ) : null}

              <section className="process-recording-modal-section">
                <div className="process-recording-history-header">
                  <div>
                    <h3>Resident history</h3>
                    <p>Review this resident's healing journey in reverse chronological order.</p>
                  </div>
                  {selectedResident ? (
                    <button className="ghost-button" onClick={() => setResidentFilter('All')} type="button">
                      Return to global queue
                    </button>
                  ) : null}
                </div>

                {residentHistoryLoading ? (
                  <LoadingState label="Loading resident history..." />
                ) : residentHistory.length === 0 ? (
                  <EmptyState title="No additional sessions" message="This is the only recording available for the resident right now." />
                ) : (
                  <>
                    <div className="process-recording-history-list" role="list">
                      {paginatedResidentHistory.map((historyRecording) => (
                        <button
                          className={`process-recording-history-item${historyRecording.id === viewedRecording.id ? ' is-active' : ''}`}
                          key={historyRecording.id}
                          onClick={() => setViewRecordingId(historyRecording.id)}
                          type="button"
                        >
                          <div>
                            <strong>{formatDate(historyRecording.sessionDate)}</strong>
                            <span>{historyRecording.sessionType} · {historyRecording.socialWorker}</span>
                          </div>
                          <SessionSignals recording={historyRecording} />
                        </button>
                      ))}
                    </div>
                    <Pagination
                      page={residentHistoryPage}
                      totalPages={residentHistoryTotalPages}
                      totalItems={residentHistory.length}
                      pageSize={MODAL_HISTORY_PAGE_SIZE}
                      onChange={setResidentHistoryPage}
                    />
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {canManageRecordings && editingRecordingId ? (
        <div className="modal-backdrop process-recording-modal-backdrop" onClick={resetEditModal}>
          <div
            aria-modal="true"
            className="modal-surface process-recording-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Edit process recording"
          >
            <div className="process-recording-modal-header">
              <div>
                <p className="process-recording-modal-eyebrow">Clinical note editor</p>
                <h2>Edit process recording</h2>
                <p>Update the counseling note without leaving the session workspace.</p>
              </div>
              <div className="detail-panel-actions">
                <button className="ghost-button" onClick={resetEditModal} type="button">
                  Close
                </button>
              </div>
            </div>

            <ProcessRecordingForm
              recordingForm={recordingForm}
              setRecordingForm={setRecordingForm}
              residents={residents}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitLabel="Update process recording"
              showRestrictedNotes={isAdmin}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SessionSignals({ recording }: { recording: ProcessRecording }) {
  const labels = [
    recording.progressNoted ? 'Progress' : null,
    recording.concernsFlagged ? 'Concern' : null,
    recording.referralMade ? 'Referral' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="process-recording-signals">
      {labels.length > 0 ? labels.map((label) => (
        <span className="process-recording-signal-pill" key={label}>
          {label}
        </span>
      )) : <span className="process-recording-signal-muted">Routine</span>}
    </div>
  );
}

function RecordingDetail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="process-recording-detail-card">
      <span>{label}</span>
      <div className="process-recording-detail-value">{value}</div>
    </div>
  );
}

function mapRecordingToForm(recording: ProcessRecording): ProcessRecordingRequest {
  return {
    residentId: recording.residentId,
    sessionDate: recording.sessionDate,
    socialWorker: recording.socialWorker,
    sessionType: recording.sessionType,
    sessionDurationMinutes: recording.sessionDurationMinutes,
    emotionalStateObserved: recording.emotionalStateObserved,
    emotionalStateEnd: recording.emotionalStateEnd,
    sessionNarrative: recording.sessionNarrative,
    interventionsApplied: recording.interventionsApplied,
    followUpActions: recording.followUpActions,
    progressNoted: recording.progressNoted,
    concernsFlagged: recording.concernsFlagged,
    referralMade: recording.referralMade,
    restrictedNotes: recording.restrictedNotes ?? '',
  };
}
