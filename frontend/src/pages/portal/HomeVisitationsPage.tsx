import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { CaseConference, CaseConferenceRequest, HomeVisitation, HomeVisitationRequest, Resident } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';

function createVisitationForm(residentId?: number): HomeVisitationRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    residentId: residentId ?? 1,
    visitDate: today,
    socialWorker: '',
    visitType: 'Routine Follow-Up',
    locationVisited: '',
    familyMembersPresent: '',
    purpose: '',
    observations: '',
    familyCooperationLevel: 'Moderate',
    safetyConcernsNoted: false,
    followUpNeeded: false,
    followUpNotes: '',
    visitOutcome: '',
  };
}

function createConferenceForm(residentId?: number): CaseConferenceRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    residentId: residentId ?? 1,
    conferenceDate: today,
    leadWorker: '',
    attendees: '',
    purpose: '',
    decisionsMade: '',
    followUpActions: '',
    nextReviewDate: '',
    status: 'Scheduled',
  };
}

const visitTypeOptions = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
];

export function HomeVisitationsPage() {
  const { token, user } = useAuth();
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [conferences, setConferences] = useState<CaseConference[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('All');
  const [conferenceStatusFilter, setConferenceStatusFilter] = useState('All');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [selectedConferenceId, setSelectedConferenceId] = useState<number | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [editingConferenceId, setEditingConferenceId] = useState<number | null>(null);
  const [visitationForm, setVisitationForm] = useState<HomeVisitationRequest>(createVisitationForm());
  const [conferenceForm, setConferenceForm] = useState<CaseConferenceRequest>(createConferenceForm());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadData = async () => {
    if (!token) return;

    // This page combines two related workflows on purpose: home visit notes and case
    // conferences are usually reviewed together when staff are checking follow-up readiness.
    setLoading(true);
    setError(null);

    try {
      const [visitationData, conferenceData, residentData] = await Promise.all([
        api.homeVisitations(token),
        api.caseConferences(token),
        api.residents(token),
      ]);

      setVisitations(visitationData);
      setConferences(conferenceData);
      setResidents(residentData);
      setSelectedVisitId((current) => current ?? visitationData[0]?.id ?? null);
      setSelectedConferenceId((current) => current ?? conferenceData[0]?.id ?? null);
      setVisitationForm((current) => current.residentId > 0 ? current : createVisitationForm(residentData[0]?.id));
      setConferenceForm((current) => current.residentId > 0 ? current : createConferenceForm(residentData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home visitations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  if (!token) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredVisitations = visitations.filter((visit) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(visit.residentCode).includes(normalizedSearch) ||
      normalizeText(visit.socialWorker).includes(normalizedSearch) ||
      normalizeText(visit.locationVisited).includes(normalizedSearch) ||
      normalizeText(visit.familyMembersPresent).includes(normalizedSearch);
    const matchesVisitType = visitTypeFilter === 'All' || visit.visitType === visitTypeFilter;
    return matchesSearch && matchesVisitType;
  });

  const filteredConferences = conferences.filter((conference) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(conference.residentCode).includes(normalizedSearch) ||
      normalizeText(conference.leadWorker).includes(normalizedSearch) ||
      normalizeText(conference.purpose).includes(normalizedSearch);
    const matchesStatus = conferenceStatusFilter === 'All' || conference.status === conferenceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedVisit = visitations.find((visit) => visit.id === selectedVisitId) ?? visitations[0] ?? null;
  const selectedConference = conferences.find((conference) => conference.id === selectedConferenceId) ?? conferences[0] ?? null;
  const safetyFlags = visitations.filter((visit) => visit.safetyConcernsNoted).length;
  const followUps = visitations.filter((visit) => visit.followUpNeeded).length;
  const upcomingConferences = conferences.filter((conference) => conference.status === 'Scheduled').length;

  const residentOptions = useMemo(
    () => residents.map((resident) => ({ value: resident.id, label: resident.caseControlNumber })),
    [residents],
  );

  const resetVisitForm = () => {
    setEditingVisitId(null);
    setVisitationForm(createVisitationForm(residents[0]?.id));
  };

  const resetConferenceForm = () => {
    setEditingConferenceId(null);
    setConferenceForm(createConferenceForm(residents[0]?.id));
  };

  const handleVisitSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting('visit');
    setFeedback(null);

    try {
      const payload = {
        ...visitationForm,
        followUpNotes: visitationForm.followUpNotes || null,
      };

      if (editingVisitId) {
        await api.updateHomeVisitation(token, editingVisitId, payload);
        setFeedback({ tone: 'success', message: 'Home visitation updated.' });
      } else {
        await api.createHomeVisitation(token, payload);
        setFeedback({ tone: 'success', message: 'Home visitation created.' });
      }

      resetVisitForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleConferenceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting('conference');
    setFeedback(null);

    try {
      const payload = {
        ...conferenceForm,
        nextReviewDate: conferenceForm.nextReviewDate || null,
      };

      if (editingConferenceId) {
        await api.updateCaseConference(token, editingConferenceId, payload);
        setFeedback({ tone: 'success', message: 'Case conference updated.' });
      } else {
        await api.createCaseConference(token, payload);
        setFeedback({ tone: 'success', message: 'Case conference created.' });
      }

      resetConferenceForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Case conference save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const deleteVisit = async (id: number) => {
    if (!token || !window.confirm('Delete this home visitation? This action requires confirmation.')) return;
    try {
      await api.deleteHomeVisitation(token, id);
      setFeedback({ tone: 'success', message: 'Home visitation deleted.' });
      if (selectedVisitId === id) setSelectedVisitId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation delete failed.' });
    }
  };

  const deleteConference = async (id: number) => {
    if (!token || !window.confirm('Delete this case conference? This action requires confirmation.')) return;
    try {
      await api.deleteCaseConference(token, id);
      setFeedback({ tone: 'success', message: 'Case conference deleted.' });
      if (selectedConferenceId === id) setSelectedConferenceId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Case conference delete failed.' });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Field work</span>
          <h1>Home visitations & case conferences</h1>
          <p>Track field visits, conference decisions, follow-up actions, and upcoming resident reviews from one workflow.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Visit records" value={String(visitations.length)} detail="Field and home visitation logs." accent />
        <MetricCard label="Follow-up actions" value={String(followUps)} detail={`${safetyFlags} visits flagged a safety concern.`} />
        <MetricCard label="Upcoming conferences" value={String(upcomingConferences)} detail="Scheduled resident reviews still ahead." />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading visitations and case conferences..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Visit log"
              subtitle={isAdmin ? 'Admins can maintain field visit records. Staff can review and search them.' : 'Staff can review and search field visits.'}
              actions={
                <div className="filter-row">
                  <input
                    aria-label="Search home visitations"
                    className="inline-search"
                    placeholder="Search visits or workers..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <select
                    aria-label="Filter visit type"
                    className="inline-select"
                    value={visitTypeFilter}
                    onChange={(event) => setVisitTypeFilter(event.target.value)}
                  >
                    <option>All</option>
                    {visitTypeOptions.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
              }
            >
              {filteredVisitations.length === 0 ? (
                <EmptyState title="No matching visits" message="Try clearing the filters or searching another worker name." />
              ) : (
                <DataTable
                  columns={['Resident', 'Visit date', 'Type', 'Worker', 'Cooperation', 'Actions']}
                  rows={filteredVisitations.map((visit) => [
                    <button className="table-link-button" key={`visit-${visit.id}`} onClick={() => setSelectedVisitId(visit.id)} type="button">
                      {visit.residentCode}
                    </button>,
                    formatDate(visit.visitDate),
                    <StatusBadge key={`visit-type-${visit.id}`} value={visit.visitType} />,
                    visit.socialWorker,
                    <StatusBadge key={`visit-coop-${visit.id}`} value={visit.familyCooperationLevel} />,
                    <div className="table-actions" key={`visit-actions-${visit.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedVisitId(visit.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingVisitId(visit.id);
                              setVisitationForm({
                                residentId: visit.residentId,
                                visitDate: visit.visitDate,
                                socialWorker: visit.socialWorker,
                                visitType: visit.visitType,
                                locationVisited: visit.locationVisited,
                                familyMembersPresent: visit.familyMembersPresent,
                                purpose: visit.purpose,
                                observations: visit.observations,
                                familyCooperationLevel: visit.familyCooperationLevel,
                                safetyConcernsNoted: visit.safetyConcernsNoted,
                                followUpNeeded: visit.followUpNeeded,
                                followUpNotes: visit.followUpNotes ?? '',
                                visitOutcome: visit.visitOutcome,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteVisit(visit.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                  emptyMessage="No home visitations match the current filters."
                  caption="Field visit history"
                />
              )}
            </SectionCard>

            <DetailPanel title={selectedVisit ? `${selectedVisit.residentCode} visit` : 'Visit details'} subtitle="Review visit purpose, home observations, and required follow-up steps.">
              {selectedVisit ? (
                <DetailList
                  items={[
                    { label: 'Visit date', value: formatDate(selectedVisit.visitDate) },
                    { label: 'Visit type', value: selectedVisit.visitType },
                    { label: 'Social worker', value: selectedVisit.socialWorker },
                    { label: 'Location', value: selectedVisit.locationVisited },
                    { label: 'Family present', value: selectedVisit.familyMembersPresent },
                    { label: 'Purpose', value: selectedVisit.purpose },
                    { label: 'Observations', value: selectedVisit.observations },
                    { label: 'Outcome', value: selectedVisit.visitOutcome },
                    { label: 'Follow-up notes', value: selectedVisit.followUpNotes ?? 'No follow-up notes recorded' },
                  ]}
                />
              ) : (
                <EmptyState title="No visit selected" message="Choose a visit from the table to inspect the field record." />
              )}
            </DetailPanel>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Case conference history"
              subtitle={isAdmin ? 'Admins can maintain conference records. Staff can review schedules and decisions.' : 'Staff can review schedules and decisions.'}
              actions={
                <div className="filter-row">
                  <select
                    aria-label="Filter conference status"
                    className="inline-select"
                    value={conferenceStatusFilter}
                    onChange={(event) => setConferenceStatusFilter(event.target.value)}
                  >
                    <option>All</option>
                    <option>Scheduled</option>
                    <option>Completed</option>
                    <option>Deferred</option>
                  </select>
                </div>
              }
            >
              {filteredConferences.length === 0 ? (
                <EmptyState title="No matching conferences" message="Try clearing the status filter or broaden your search." />
              ) : (
                <DataTable
                  columns={['Resident', 'Conference date', 'Lead worker', 'Status', 'Actions']}
                  rows={filteredConferences.map((conference) => [
                    <button className="table-link-button" key={`conference-${conference.id}`} onClick={() => setSelectedConferenceId(conference.id)} type="button">
                      {conference.residentCode}
                    </button>,
                    formatDate(conference.conferenceDate),
                    conference.leadWorker,
                    <StatusBadge key={`conf-status-${conference.id}`} value={conference.status} />,
                    <div className="table-actions" key={`conference-actions-${conference.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedConferenceId(conference.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingConferenceId(conference.id);
                              setConferenceForm({
                                residentId: conference.residentId,
                                conferenceDate: conference.conferenceDate,
                                leadWorker: conference.leadWorker,
                                attendees: conference.attendees,
                                purpose: conference.purpose,
                                decisionsMade: conference.decisionsMade,
                                followUpActions: conference.followUpActions,
                                nextReviewDate: conference.nextReviewDate ?? '',
                                status: conference.status,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteConference(conference.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                  emptyMessage="No case conferences match the current filters."
                  caption="Resident case conference history"
                />
              )}
            </SectionCard>

            <DetailPanel title={selectedConference ? `${selectedConference.residentCode} conference` : 'Conference details'} subtitle="Use the detail panel to explain decisions, attendees, and next review actions.">
              {selectedConference ? (
                <DetailList
                  items={[
                    { label: 'Conference date', value: formatDate(selectedConference.conferenceDate) },
                    { label: 'Lead worker', value: selectedConference.leadWorker },
                    { label: 'Status', value: selectedConference.status },
                    { label: 'Attendees', value: selectedConference.attendees },
                    { label: 'Purpose', value: selectedConference.purpose },
                    { label: 'Decisions made', value: selectedConference.decisionsMade },
                    { label: 'Follow-up actions', value: selectedConference.followUpActions },
                    { label: 'Next review', value: selectedConference.nextReviewDate ? formatDate(selectedConference.nextReviewDate) : 'No next review scheduled' },
                  ]}
                />
              ) : (
                <EmptyState title="No conference selected" message="Choose a case conference to inspect the resident review details." />
              )}
            </DetailPanel>
          </section>

          {isAdmin ? (
            <>
              <SectionCard
                title={editingVisitId ? 'Edit home visitation' : 'Create home visitation'}
                subtitle="Capture visit type, observations, safety concerns, and follow-up actions."
                actions={editingVisitId ? <button className="ghost-button" onClick={resetVisitForm} type="button">Cancel edit</button> : null}
              >
                <form className="stack-form" onSubmit={handleVisitSubmit}>
                  <FormSection title="Visit details">
                    <FormGrid>
                      <label>
                        <span>Resident</span>
                        <select value={visitationForm.residentId} onChange={(event) => setVisitationForm({ ...visitationForm, residentId: Number(event.target.value) })}>
                          {residentOptions.map((resident) => (
                            <option key={resident.value} value={resident.value}>
                              {resident.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label><span>Visit date</span><input type="date" value={visitationForm.visitDate} onChange={(event) => setVisitationForm({ ...visitationForm, visitDate: event.target.value })} required /></label>
                      <label><span>Social worker</span><input value={visitationForm.socialWorker} onChange={(event) => setVisitationForm({ ...visitationForm, socialWorker: event.target.value })} required /></label>
                      <label>
                        <span>Visit type</span>
                        <select value={visitationForm.visitType} onChange={(event) => setVisitationForm({ ...visitationForm, visitType: event.target.value })}>
                          {visitTypeOptions.map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                      </label>
                      <label><span>Location visited</span><input value={visitationForm.locationVisited} onChange={(event) => setVisitationForm({ ...visitationForm, locationVisited: event.target.value })} required /></label>
                      <label><span>Family members present</span><input value={visitationForm.familyMembersPresent} onChange={(event) => setVisitationForm({ ...visitationForm, familyMembersPresent: event.target.value })} required /></label>
                      <label><span>Family cooperation</span><input value={visitationForm.familyCooperationLevel} onChange={(event) => setVisitationForm({ ...visitationForm, familyCooperationLevel: event.target.value })} required /></label>
                      <label><span>Visit outcome</span><input value={visitationForm.visitOutcome} onChange={(event) => setVisitationForm({ ...visitationForm, visitOutcome: event.target.value })} required /></label>
                    </FormGrid>
                  </FormSection>

                  <FormSection title="Observations and actions">
                    <label><span>Purpose</span><textarea value={visitationForm.purpose} onChange={(event) => setVisitationForm({ ...visitationForm, purpose: event.target.value })} rows={3} required /></label>
                    <label><span>Observations</span><textarea value={visitationForm.observations} onChange={(event) => setVisitationForm({ ...visitationForm, observations: event.target.value })} rows={4} required /></label>
                  </FormSection>

                  <div className="check-grid">
                    <CheckboxField label="Safety concerns noted" checked={visitationForm.safetyConcernsNoted} onChange={(checked) => setVisitationForm({ ...visitationForm, safetyConcernsNoted: checked })} />
                    <CheckboxField label="Follow-up needed" checked={visitationForm.followUpNeeded} onChange={(checked) => setVisitationForm({ ...visitationForm, followUpNeeded: checked })} />
                  </div>

                  <label><span>Follow-up notes</span><textarea value={visitationForm.followUpNotes ?? ''} onChange={(event) => setVisitationForm({ ...visitationForm, followUpNotes: event.target.value })} rows={3} /></label>

                  <div className="form-actions">
                    <button className="primary-button" disabled={submitting === 'visit'} type="submit">
                      {submitting === 'visit' ? 'Saving...' : editingVisitId ? 'Update home visitation' : 'Create home visitation'}
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                title={editingConferenceId ? 'Edit case conference' : 'Create case conference'}
                subtitle="Record attendee decisions, next review dates, and required follow-up actions."
                actions={editingConferenceId ? <button className="ghost-button" onClick={resetConferenceForm} type="button">Cancel edit</button> : null}
              >
                <form className="stack-form" onSubmit={handleConferenceSubmit}>
                  <FormSection title="Conference details">
                    <FormGrid>
                      <label>
                        <span>Resident</span>
                        <select value={conferenceForm.residentId} onChange={(event) => setConferenceForm({ ...conferenceForm, residentId: Number(event.target.value) })}>
                          {residentOptions.map((resident) => (
                            <option key={resident.value} value={resident.value}>
                              {resident.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label><span>Conference date</span><input type="date" value={conferenceForm.conferenceDate} onChange={(event) => setConferenceForm({ ...conferenceForm, conferenceDate: event.target.value })} required /></label>
                      <label><span>Lead worker</span><input value={conferenceForm.leadWorker} onChange={(event) => setConferenceForm({ ...conferenceForm, leadWorker: event.target.value })} required /></label>
                      <label>
                        <span>Status</span>
                        <select value={conferenceForm.status} onChange={(event) => setConferenceForm({ ...conferenceForm, status: event.target.value })}>
                          <option>Scheduled</option>
                          <option>Completed</option>
                          <option>Deferred</option>
                        </select>
                      </label>
                      <label><span>Next review date</span><input type="date" value={conferenceForm.nextReviewDate ?? ''} onChange={(event) => setConferenceForm({ ...conferenceForm, nextReviewDate: event.target.value })} /></label>
                    </FormGrid>
                  </FormSection>

                  <FormSection title="Conference narrative">
                    <label><span>Attendees</span><textarea value={conferenceForm.attendees} onChange={(event) => setConferenceForm({ ...conferenceForm, attendees: event.target.value })} rows={2} required /></label>
                    <label><span>Purpose</span><textarea value={conferenceForm.purpose} onChange={(event) => setConferenceForm({ ...conferenceForm, purpose: event.target.value })} rows={3} required /></label>
                    <label><span>Decisions made</span><textarea value={conferenceForm.decisionsMade} onChange={(event) => setConferenceForm({ ...conferenceForm, decisionsMade: event.target.value })} rows={4} required /></label>
                    <label><span>Follow-up actions</span><textarea value={conferenceForm.followUpActions} onChange={(event) => setConferenceForm({ ...conferenceForm, followUpActions: event.target.value })} rows={4} required /></label>
                  </FormSection>

                  <div className="form-actions">
                    <button className="primary-button" disabled={submitting === 'conference'} type="submit">
                      {submitting === 'conference' ? 'Saving...' : editingConferenceId ? 'Update case conference' : 'Create case conference'}
                    </button>
                  </div>
                </form>
              </SectionCard>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
