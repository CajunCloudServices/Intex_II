import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { ProcessRecording, ProcessRecordingRequest, Resident } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';

function createRecordingForm(residentId?: number): ProcessRecordingRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    residentId: residentId ?? 1,
    sessionDate: today,
    socialWorker: '',
    sessionType: 'Individual',
    sessionDurationMinutes: 60,
    emotionalStateObserved: '',
    emotionalStateEnd: '',
    sessionNarrative: '',
    interventionsApplied: '',
    followUpActions: '',
    progressNoted: false,
    concernsFlagged: false,
    referralMade: false,
    restrictedNotes: '',
  };
}

export function ProcessRecordingPage() {
  const { token, user } = useAuth();
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
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
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [recordingData, residentData] = await Promise.all([api.processRecordings(token), api.residents(token)]);
      setRecordings(recordingData);
      setResidents(residentData);
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
  }, [token]);

  if (!token) return null;

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
    if (!token) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        ...recordingForm,
        restrictedNotes: recordingForm.restrictedNotes || null,
      };

      if (editingRecordingId) {
        await api.updateProcessRecording(token, editingRecordingId, payload);
        setFeedback({ tone: 'success', message: 'Process recording updated.' });
      } else {
        await api.createProcessRecording(token, payload);
        setFeedback({ tone: 'success', message: 'Process recording created.' });
      }

      resetForm();
      await loadRecordings();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Process recording save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecording = async (id: number) => {
    if (!token || !window.confirm('Delete this process recording? This action requires confirmation.')) return;
    try {
      await api.deleteProcessRecording(token, id);
      setFeedback({ tone: 'success', message: 'Process recording deleted.' });
      if (selectedRecordingId === id) setSelectedRecordingId(null);
      await loadRecordings();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Process recording delete failed.' });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Clinical notes</span>
          <h1>Process recordings</h1>
          <p>Chronological counseling documentation starter view with emotional-state and follow-up fields.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Sessions" value={String(recordings.length)} detail="Loaded process recording rows." accent />
        <MetricCard label="Progress noted" value={String(progressCount)} detail="Sessions that ended with visible progress." />
        <MetricCard label="Escalations" value={String(concernCount + referralCount)} detail={`${referralCount} referrals and ${concernCount} concern flags.`} />
      </section>

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
                    recording.emotionalStateObserved,
                    recording.emotionalStateEnd,
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

            <DetailPanel title={selectedRecording ? `${selectedRecording.residentCode} session` : 'Session details'} subtitle="Use the detail panel during demos to show the narrative side of case documentation.">
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

          {isAdmin ? (
            <SectionCard
              title={editingRecordingId ? 'Edit process recording' : 'Create process recording'}
              subtitle="Plain-language fields keep the starter structure easy for your team to follow."
              actions={editingRecordingId ? <button className="ghost-button" onClick={resetForm} type="button">Cancel edit</button> : null}
            >
              <form className="stack-form" onSubmit={handleSubmit}>
                <FormSection title="Session metadata">
                  <FormGrid>
                    <label>
                      <span>Resident</span>
                      <select value={recordingForm.residentId} onChange={(event) => setRecordingForm({ ...recordingForm, residentId: Number(event.target.value) })}>
                        {residents.map((resident) => (
                          <option key={resident.id} value={resident.id}>
                            {resident.caseControlNumber}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label><span>Session date</span><input type="date" value={recordingForm.sessionDate} onChange={(event) => setRecordingForm({ ...recordingForm, sessionDate: event.target.value })} required /></label>
                    <label><span>Social worker</span><input value={recordingForm.socialWorker} onChange={(event) => setRecordingForm({ ...recordingForm, socialWorker: event.target.value })} required /></label>
                    <label><span>Session type</span><input value={recordingForm.sessionType} onChange={(event) => setRecordingForm({ ...recordingForm, sessionType: event.target.value })} required /></label>
                    <label><span>Duration (minutes)</span><input type="number" min="1" value={recordingForm.sessionDurationMinutes} onChange={(event) => setRecordingForm({ ...recordingForm, sessionDurationMinutes: Number(event.target.value) })} required /></label>
                    <label><span>Observed state</span><input value={recordingForm.emotionalStateObserved} onChange={(event) => setRecordingForm({ ...recordingForm, emotionalStateObserved: event.target.value })} required /></label>
                    <label><span>End state</span><input value={recordingForm.emotionalStateEnd} onChange={(event) => setRecordingForm({ ...recordingForm, emotionalStateEnd: event.target.value })} required /></label>
                  </FormGrid>
                </FormSection>

                <FormSection title="Session narrative">
                  <label><span>Narrative</span><textarea value={recordingForm.sessionNarrative} onChange={(event) => setRecordingForm({ ...recordingForm, sessionNarrative: event.target.value })} rows={4} required /></label>
                  <FormGrid>
                    <label><span>Interventions applied</span><textarea value={recordingForm.interventionsApplied} onChange={(event) => setRecordingForm({ ...recordingForm, interventionsApplied: event.target.value })} rows={3} required /></label>
                    <label><span>Follow-up actions</span><textarea value={recordingForm.followUpActions} onChange={(event) => setRecordingForm({ ...recordingForm, followUpActions: event.target.value })} rows={3} required /></label>
                  </FormGrid>
                </FormSection>

                <div className="check-grid">
                  <CheckboxField label="Progress noted" checked={recordingForm.progressNoted} onChange={(checked) => setRecordingForm({ ...recordingForm, progressNoted: checked })} />
                  <CheckboxField label="Concerns flagged" checked={recordingForm.concernsFlagged} onChange={(checked) => setRecordingForm({ ...recordingForm, concernsFlagged: checked })} />
                  <CheckboxField label="Referral made" checked={recordingForm.referralMade} onChange={(checked) => setRecordingForm({ ...recordingForm, referralMade: checked })} />
                </div>

                <label><span>Restricted notes</span><textarea value={recordingForm.restrictedNotes ?? ''} onChange={(event) => setRecordingForm({ ...recordingForm, restrictedNotes: event.target.value })} rows={3} /></label>

                <div className="form-actions">
                  <button className="primary-button" disabled={submitting} type="submit">
                    {submitting ? 'Saving...' : editingRecordingId ? 'Update process recording' : 'Create process recording'}
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
