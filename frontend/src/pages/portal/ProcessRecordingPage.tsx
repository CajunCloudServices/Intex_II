import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { CounselingRiskSummary, ProcessRecording, ProcessRecordingRequest, Resident } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';
import { createRecordingForm } from './forms/processRecordingDefaults';
import { ProcessRecordingForm } from './forms/ProcessRecordingForm';

export function ProcessRecordingPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [counselingRiskSummary, setCounselingRiskSummary] = useState<CounselingRiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | null>(null);
  const [editingRecordingId, setEditingRecordingId] = useState<number | null>(null);
  const [recordingForm, setRecordingForm] = useState<ProcessRecordingRequest>(createRecordingForm());
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadRecordings = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [recordingData, residentData, counselingRiskData] = await Promise.all([
        api.processRecordings(),
        api.residents(),
        api.counselingRiskSummary(10),
      ]);
      setRecordings(recordingData);
      setResidents(residentData);
      setCounselingRiskSummary(counselingRiskData);
      setSelectedRecordingId((current) => current ?? recordingData[0]?.id ?? null);
      setRecordingForm((current) => current.residentId > 0 ? current : createRecordingForm(residentData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load process recordings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecordings();
  }, [user]);

  if (!user) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const selectedRecording = recordings.find((recording) => recording.id === selectedRecordingId) ?? recordings[0] ?? null;
  const filteredRecordings = recordings.filter((recording) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(recording.residentCode).includes(normalizedSearch) ||
      normalizeText(recording.socialWorker).includes(normalizedSearch) ||
      normalizeText(recording.emotionalStateObserved).includes(normalizedSearch) ||
      normalizeText(recording.sessionType).includes(normalizedSearch);
    const matchesSession = sessionFilter === 'All' || recording.sessionType === sessionFilter;
    return matchesSearch && matchesSession;
  });

  const progressCount = recordings.filter((recording) => recording.progressNoted).length;
  const referralCount = recordings.filter((recording) => recording.referralMade).length;
  const concernCount = recordings.filter((recording) => recording.concernsFlagged).length;

  const resetForm = () => {
    setEditingRecordingId(null);
    setRecordingForm(createRecordingForm(residents[0]?.id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      if (!editingRecordingId) return;
      const payload = {
        ...recordingForm,
        restrictedNotes: recordingForm.restrictedNotes || null,
      };

      await api.updateProcessRecording(editingRecordingId, payload);
      setFeedback({ tone: 'success', message: 'Process recording updated.' });

      resetForm();
      await loadRecordings();
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
      if (selectedRecordingId === id) setSelectedRecordingId(null);
      await loadRecordings();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Process recording delete failed.' });
    }
  };

  const headerActions =
    isAdmin ? [{ label: 'New Process Recording', to: '/portal/process-recordings/new' }] : undefined;

  return (
    <div className="page-shell">
      <StaffPortalPageHeader
        eyebrow="Clinical notes"
        title="Process recordings"
        description="Document counseling sessions chronologically so staff can follow each resident's healing journey over time."
        actions={headerActions}
      />

      <section className="page-grid three">
        <MetricCard label="Sessions" value={String(recordings.length)} detail="Loaded process recording rows." accent />
        <MetricCard label="Progress noted" value={String(progressCount)} detail="Sessions that ended with visible progress." />
        <MetricCard label="Escalations" value={String(concernCount + referralCount)} detail={`${referralCount} referrals and ${concernCount} concern flags.`} />
      </section>

      <SectionCard title="Counseling risk monitor" subtitle="Deployed concern-probability scoring for triage handoff.">
        <section className="page-grid four compact">
          <MetricCard label="Scored sessions" value={String(counselingRiskSummary?.evaluatedSessions ?? 0)} detail="Sessions included in latest scoring run." />
          <MetricCard label="High risk" value={String(counselingRiskSummary?.highRiskCount ?? 0)} detail="Immediate follow-up advised." accent />
          <MetricCard label="Medium risk" value={String(counselingRiskSummary?.mediumRiskCount ?? 0)} detail="Review in weekly supervision." />
          <MetricCard label="Low risk" value={String(counselingRiskSummary?.lowRiskCount ?? 0)} detail="Routine monitoring only." />
        </section>
        <DataTable
          columns={['Resident', 'Date', 'Session', 'Concern probability', 'Tier', 'Primary factor']}
          rows={(counselingRiskSummary?.topRiskSessions ?? []).map((risk) => [
            risk.residentCode,
            risk.sessionDate,
            risk.sessionType,
            `${(risk.concernProbability * 100).toFixed(1)}%`,
            risk.riskTier,
            risk.primaryFactor,
          ])}
          emptyMessage="No counseling risk data was returned."
          caption="Top counseling risk sessions"
        />
      </SectionCard>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading process recordings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRecordings} />
      ) : (
        <>
          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Recent sessions"
              subtitle={isAdmin ? 'Admins can create, update, and delete process recordings.' : 'Staff can review process recordings without editing them.'}
              actions={
                <div className="filter-row">
                  <input
                    aria-label="Search process recordings"
                    className="inline-search"
                    placeholder="Search sessions..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <select
                    aria-label="Filter session type"
                    className="inline-select"
                    value={sessionFilter}
                    onChange={(event) => setSessionFilter(event.target.value)}
                  >
                    <option>All</option>
                    <option>Individual</option>
                    <option>Group</option>
                    <option>Family</option>
                    <option>Crisis</option>
                  </select>
                </div>
              }
            >
              {filteredRecordings.length === 0 ? (
                <EmptyState title="No matching sessions" message="Try clearing the filters or searching another resident code." />
              ) : (
                <DataTable
                  columns={['Resident', 'Date', 'Worker', 'Observed', 'End state', 'Actions']}
                  rows={filteredRecordings.map((recording) => [
                    <button className="table-link-button" key={`recording-${recording.id}`} onClick={() => setSelectedRecordingId(recording.id)} type="button">
                      {recording.residentCode}
                    </button>,
                    formatDate(recording.sessionDate),
                    recording.socialWorker,
                    <StatusBadge key={`state-obs-${recording.id}`} value={recording.emotionalStateObserved} />,
                    <StatusBadge key={`state-end-${recording.id}`} value={recording.emotionalStateEnd} />,
                    <div className="table-actions" key={`recording-actions-${recording.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedRecordingId(recording.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingRecordingId(recording.id);
                              setRecordingForm({
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
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteRecording(recording.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                  emptyMessage="No process recordings match the current filters."
                  caption="Counseling session history"
                />
              )}
            </SectionCard>

            <DetailPanel title={selectedRecording ? `${selectedRecording.residentCode} session` : 'Session details'} subtitle="Use the detail panel to show how emotional state, interventions, and follow-up evolve across the healing journey.">
              {selectedRecording ? (
                <DetailList
                  items={[
                    { label: 'Session type', value: selectedRecording.sessionType },
                    { label: 'Date', value: formatDate(selectedRecording.sessionDate) },
                    { label: 'Social worker', value: selectedRecording.socialWorker },
                    { label: 'Duration', value: `${selectedRecording.sessionDurationMinutes} minutes` },
                    { label: 'Observed state', value: selectedRecording.emotionalStateObserved },
                    { label: 'End state', value: selectedRecording.emotionalStateEnd },
                    { label: 'Interventions', value: selectedRecording.interventionsApplied },
                    { label: 'Follow-up', value: selectedRecording.followUpActions },
                    { label: 'Narrative', value: selectedRecording.sessionNarrative },
                  ]}
                />
              ) : (
                <EmptyState title="No session selected" message="Choose a session from the table to inspect the note details." />
              )}
            </DetailPanel>
          </section>

          {isAdmin && editingRecordingId ? (
            <SectionCard
              title="Edit process recording"
              subtitle="Capture the full counseling narrative with enough structure to review progress over time."
              actions={
                <button className="ghost-button" onClick={resetForm} type="button">
                  Cancel edit
                </button>
              }
            >
              <ProcessRecordingForm
                recordingForm={recordingForm}
                setRecordingForm={setRecordingForm}
                residents={residents}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitLabel="Update process recording"
              />
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
