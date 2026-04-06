import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { HomeVisitation, HomeVisitationRequest, Resident } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
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

export function HomeVisitationsPage() {
  const { token, user } = useAuth();
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('All');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [visitationForm, setVisitationForm] = useState<HomeVisitationRequest>(createVisitationForm());
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadVisitations = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [visitationData, residentData] = await Promise.all([api.homeVisitations(token), api.residents(token)]);
      setVisitations(visitationData);
      setResidents(residentData);
      setSelectedVisitId((current) => current ?? visitationData[0]?.id ?? null);
      setVisitationForm((current) => current.residentId > 0 ? current : createVisitationForm(residentData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home visitations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVisitations();
  }, [token]);

  if (!token) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const selectedVisit = visitations.find((visit) => visit.id === selectedVisitId) ?? visitations[0] ?? null;
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

  const safetyFlags = visitations.filter((visit) => visit.safetyConcernsNoted).length;
  const followUps = visitations.filter((visit) => visit.followUpNeeded).length;
  const emergencyVisits = visitations.filter((visit) => visit.visitType === 'Emergency').length;

  const resetForm = () => {
    setEditingVisitId(null);
    setVisitationForm(createVisitationForm(residents[0]?.id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
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

      resetForm();
      await loadVisitations();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVisit = async (id: number) => {
    if (!token || !window.confirm('Delete this home visitation? This action requires confirmation.')) return;
    try {
      await api.deleteHomeVisitation(token, id);
      setFeedback({ tone: 'success', message: 'Home visitation deleted.' });
      if (selectedVisitId === id) setSelectedVisitId(null);
      await loadVisitations();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation delete failed.' });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Field work</span>
          <h1>Home visitations</h1>
          <p>Starter page for visit logs, safety concerns, and case conference follow-up planning.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Visit records" value={String(visitations.length)} detail="Loaded home visitation rows." accent />
        <MetricCard label="Safety flags" value={String(safetyFlags)} detail="Visits where staff noted a concern." />
        <MetricCard label="Follow-ups" value={String(followUps)} detail={`${emergencyVisits} emergency visits in the current list.`} />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading home visitations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadVisitations} />
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
                    placeholder="Search visitations..."
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
                    <option>Initial Assessment</option>
                    <option>Routine Follow-Up</option>
                    <option>Reintegration Assessment</option>
                    <option>Post-Placement Monitoring</option>
                    <option>Emergency</option>
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
                    visit.visitType,
                    visit.socialWorker,
                    visit.familyCooperationLevel,
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

            <DetailPanel title={selectedVisit ? `${selectedVisit.residentCode} visit` : 'Visit details'} subtitle="Use the detail panel to explain why a visit happened and what follow-up is required.">
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

          {isAdmin ? (
            <SectionCard
              title={editingVisitId ? 'Edit home visitation' : 'Create home visitation'}
              subtitle="This starter form keeps the fields close to the backend contract so the flow stays easy to understand."
              actions={editingVisitId ? <button className="ghost-button" onClick={resetForm} type="button">Cancel edit</button> : null}
            >
              <form className="stack-form" onSubmit={handleSubmit}>
                <FormSection title="Visit details">
                  <FormGrid>
                    <label>
                      <span>Resident</span>
                      <select value={visitationForm.residentId} onChange={(event) => setVisitationForm({ ...visitationForm, residentId: Number(event.target.value) })}>
                        {residents.map((resident) => (
                          <option key={resident.id} value={resident.id}>
                            {resident.caseControlNumber}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label><span>Visit date</span><input type="date" value={visitationForm.visitDate} onChange={(event) => setVisitationForm({ ...visitationForm, visitDate: event.target.value })} required /></label>
                    <label><span>Social worker</span><input value={visitationForm.socialWorker} onChange={(event) => setVisitationForm({ ...visitationForm, socialWorker: event.target.value })} required /></label>
                    <label><span>Visit type</span><input value={visitationForm.visitType} onChange={(event) => setVisitationForm({ ...visitationForm, visitType: event.target.value })} required /></label>
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
                  <button className="primary-button" disabled={submitting} type="submit">
                    {submitting ? 'Saving...' : editingVisitId ? 'Update home visitation' : 'Create home visitation'}
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
