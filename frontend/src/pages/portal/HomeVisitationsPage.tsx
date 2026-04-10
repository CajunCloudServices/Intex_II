import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { CaseConference, CaseConferenceRequest, HomeVisitation, HomeVisitationRequest, Resident } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';
import { CaseConferenceRecordForm, type CaseConferenceFieldErrors } from './forms/CaseConferenceRecordForm';
import { buildVisitLocationOptions, buildWorkerOptions, createConferenceForm, createVisitationForm, visitTypeOptions } from './forms/homeVisitationDefaults';
import { HomeVisitationRecordForm, type HomeVisitationFieldErrors } from './forms/HomeVisitationRecordForm';

export function HomeVisitationsPage() {
  const { user } = useAuth();
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [conferences, setConferences] = useState<CaseConference[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [visitFieldErrors, setVisitFieldErrors] = useState<HomeVisitationFieldErrors>({});
  const [conferenceFieldErrors, setConferenceFieldErrors] = useState<CaseConferenceFieldErrors>({});
  const [search, setSearch] = useState('');
  const [residentFilter, setResidentFilter] = useState('All');
  const [visitTypeFilter, setVisitTypeFilter] = useState('All');
  const [viewVisitId, setViewVisitId] = useState<number | null>(null);
  const [viewConferenceId, setViewConferenceId] = useState<number | null>(null);
  const [creatingVisit, setCreatingVisit] = useState(false);
  const [creatingConference, setCreatingConference] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [editingConferenceId, setEditingConferenceId] = useState<number | null>(null);
  const [visitationForm, setVisitationForm] = useState<HomeVisitationRequest>(createVisitationForm());
  const [conferenceForm, setConferenceForm] = useState<CaseConferenceRequest>(createConferenceForm());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [visitPage, setVisitPage] = useState(1);
  const [upcomingConferencePage, setUpcomingConferencePage] = useState(1);
  const [conferenceHistoryPage, setConferenceHistoryPage] = useState(1);
  const visitPageSize = 10;
  const conferencePageSize = 8;
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;
  const canManageRecords = (user?.roles.includes('Admin') ?? false) || (user?.roles.includes('Staff') ?? false);

  const loadData = async () => {
    if (!user) return;

    // This page combines two related workflows on purpose: home visit notes and case
    // conferences are usually reviewed together when staff are checking follow-up readiness.
    setLoading(true);
    setError(null);

    try {
      const [visitationData, conferenceData, residentData] = await Promise.all([
        api.homeVisitations(),
        api.caseConferences(),
        api.residents(),
      ]);

      setVisitations(visitationData);
      setConferences(conferenceData);
      setResidents(residentData);
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
  }, [user]);

  if (!user) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const residentIdFilter = residentFilter === 'All' ? null : Number(residentFilter);
  const resetPagination = () => {
    setVisitPage(1);
    setUpcomingConferencePage(1);
    setConferenceHistoryPage(1);
  };
  const today = new Date().toISOString().slice(0, 10);
  const filteredVisitations = visitations.filter((visit) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(visit.residentCode).includes(normalizedSearch) ||
      normalizeText(visit.socialWorker).includes(normalizedSearch) ||
      normalizeText(visit.locationVisited).includes(normalizedSearch) ||
      normalizeText(visit.familyMembersPresent).includes(normalizedSearch);
    const matchesResident = residentIdFilter === null || visit.residentId === residentIdFilter;
    const matchesVisitType = visitTypeFilter === 'All' || visit.visitType === visitTypeFilter;
    return matchesSearch && matchesResident && matchesVisitType;
  });

  const visitTotalPages = Math.max(1, Math.ceil(filteredVisitations.length / visitPageSize));
  const safedVisitPage = Math.min(visitPage, visitTotalPages);
  const pagedVisitations = filteredVisitations.slice((safedVisitPage - 1) * visitPageSize, safedVisitPage * visitPageSize);

  const filteredConferenceRecords = conferences.filter((conference) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(conference.residentCode).includes(normalizedSearch) ||
      normalizeText(conference.leadWorker).includes(normalizedSearch) ||
      normalizeText(conference.purpose).includes(normalizedSearch);
    const matchesResident = residentIdFilter === null || conference.residentId === residentIdFilter;
    return matchesSearch && matchesResident;
  });

  const upcomingConferenceRecords = filteredConferenceRecords.filter(
    (conference) => conference.status === 'Scheduled' && conference.conferenceDate >= today,
  );
  const conferenceHistoryRecords = filteredConferenceRecords.filter(
    (conference) => conference.status === 'Completed' || conference.status === 'Deferred' || (conference.status === 'Scheduled' && conference.conferenceDate < today),
  );
  const upcomingConferenceTotalPages = Math.max(1, Math.ceil(upcomingConferenceRecords.length / conferencePageSize));
  const safeUpcomingConferencePage = Math.min(upcomingConferencePage, upcomingConferenceTotalPages);
  const pagedUpcomingConferenceRecords = upcomingConferenceRecords.slice(
    (safeUpcomingConferencePage - 1) * conferencePageSize,
    safeUpcomingConferencePage * conferencePageSize,
  );
  const conferenceHistoryTotalPages = Math.max(1, Math.ceil(conferenceHistoryRecords.length / conferencePageSize));
  const safeConferenceHistoryPage = Math.min(conferenceHistoryPage, conferenceHistoryTotalPages);
  const pagedConferenceHistoryRecords = conferenceHistoryRecords.slice(
    (safeConferenceHistoryPage - 1) * conferencePageSize,
    safeConferenceHistoryPage * conferencePageSize,
  );

  const viewedVisit = visitations.find((visit) => visit.id === viewVisitId) ?? null;
  const viewedConference = conferences.find((conference) => conference.id === viewConferenceId) ?? null;
  const safetyFlags = visitations.filter((visit) => visit.safetyConcernsNoted).length;
  const followUps = visitations.filter((visit) => visit.followUpNeeded).length;
  const upcomingConferences = conferences.filter((conference) => conference.status === 'Scheduled' && conference.conferenceDate >= today).length;

  const residentOptions = useMemo(
    () => residents.map((resident) => ({ value: resident.id, label: resident.caseControlNumber })),
    [residents],
  );
  const workerOptions = useMemo(() => buildWorkerOptions(residents, visitations, conferences), [conferences, residents, visitations]);
  const visitLocationOptions = useMemo(() => buildVisitLocationOptions(residents, visitations), [residents, visitations]);

  const viewResidentOptions = useMemo(
    () => [{ value: 'All', label: 'All residents' }, ...residents.map((resident) => ({ value: String(resident.id), label: resident.caseControlNumber }))],
    [residents],
  );

  const resetVisitForm = () => {
    setCreatingVisit(false);
    setEditingVisitId(null);
    setVisitationForm(createVisitationForm(residents[0]?.id));
    setVisitFieldErrors({});
  };

  const resetConferenceForm = () => {
    setCreatingConference(false);
    setEditingConferenceId(null);
    setConferenceForm(createConferenceForm(residents[0]?.id));
    setConferenceFieldErrors({});
  };

  const openCreateVisitModal = () => {
    setCreatingVisit(true);
    setEditingVisitId(null);
    setVisitationForm(createVisitationForm(residents[0]?.id));
    setVisitFieldErrors({});
  };

  const openEditVisitModal = (visit: HomeVisitation) => {
    setCreatingVisit(false);
    setEditingVisitId(visit.id);
    setVisitationForm(mapVisitToForm(visit));
    setVisitFieldErrors({});
  };

  const openCreateConferenceModal = () => {
    setCreatingConference(true);
    setEditingConferenceId(null);
    setConferenceForm(createConferenceForm(residents[0]?.id));
    setConferenceFieldErrors({});
  };

  const openEditConferenceModal = (conference: CaseConference) => {
    setCreatingConference(false);
    setEditingConferenceId(conference.id);
    setConferenceForm(mapConferenceToForm(conference));
    setConferenceFieldErrors({});
  };

  const handleVisitSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !canManageRecords) return;
    const fieldErrors = validateHomeVisitationForm(visitationForm);
    if (Object.keys(fieldErrors).length > 0) {
      setVisitFieldErrors(fieldErrors);
      return;
    }
    setSubmitting('visit');
    setVisitFieldErrors({});

    try {
      const payload = {
        ...visitationForm,
        safetyConcernDetails: visitationForm.safetyConcernsNoted ? visitationForm.safetyConcernDetails : '',
        followUpNotes: visitationForm.followUpNotes || null,
      };

      const wasEditing = Boolean(editingVisitId);
      if (editingVisitId) {
        await api.updateHomeVisitation(editingVisitId, payload);
      } else {
        await api.createHomeVisitation(payload);
      }

      resetVisitForm();
      await loadData();
      setFeedback({ tone: 'success', message: wasEditing ? 'Home visitation updated.' : 'Home visitation created.' });
    } catch (err) {
      const apiFieldErrors = extractHomeVisitationFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setVisitFieldErrors(apiFieldErrors);
      } else {
        setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation save failed.' });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const handleConferenceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !canManageRecords) return;
    const fieldErrors = validateCaseConferenceForm(conferenceForm);
    if (Object.keys(fieldErrors).length > 0) {
      setConferenceFieldErrors(fieldErrors);
      return;
    }
    setSubmitting('conference');
    setConferenceFieldErrors({});

    try {
      const payload = {
        ...conferenceForm,
        nextReviewDate: conferenceForm.nextReviewDate || null,
      };

      const wasEditing = Boolean(editingConferenceId);
      if (editingConferenceId) {
        await api.updateCaseConference(editingConferenceId, payload);
      } else {
        await api.createCaseConference(payload);
      }

      resetConferenceForm();
      await loadData();
      setFeedback({ tone: 'success', message: wasEditing ? 'Case conference updated.' : 'Case conference created.' });
    } catch (err) {
      const apiFieldErrors = extractCaseConferenceFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setConferenceFieldErrors(apiFieldErrors);
      } else {
        setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Case conference save failed.' });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const deleteVisit = async (id: number) => {
    if (!user || !window.confirm('Delete this home visitation? This action requires confirmation.')) return;
    try {
      await api.deleteHomeVisitation(id);
      setFeedback({ tone: 'success', message: 'Home visitation deleted.' });
      if (viewVisitId === id) setViewVisitId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation delete failed.' });
    }
  };

  const deleteConference = async (id: number) => {
    if (!user || !window.confirm('Delete this case conference? This action requires confirmation.')) return;
    try {
      await api.deleteCaseConference(id);
      setFeedback({ tone: 'success', message: 'Case conference deleted.' });
      if (viewConferenceId === id) setViewConferenceId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Case conference delete failed.' });
    }
  };

  const homeVisitHeaderActions = canManageRecords
    ? [
        { label: 'Log Home Visit', onClick: openCreateVisitModal },
        { label: 'Schedule Conference', onClick: openCreateConferenceModal },
      ]
    : undefined;

  const visitFormOpen = canManageRecords && (creatingVisit || editingVisitId !== null);
  const conferenceFormOpen = canManageRecords && (creatingConference || editingConferenceId !== null);

  return (
    <div className="page-shell">
      <StaffPortalPageHeader
        eyebrow="Field work"
        title="Home visitations & case conferences"
        description="Track field visits, conference decisions, follow-up actions, and upcoming resident reviews from one workflow."
        actions={homeVisitHeaderActions}
      />

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
          <SectionCard
            title="Home and field visit log"
            subtitle={canManageRecords ? 'Staff can log, review, and update visit records from one workspace.' : 'Review and search visit records.'}
            actions={
              <div className="home-visitations-filter-area">
                <div className="filter-group home-visitations-filter-search">
                  <label className="filter-label" htmlFor="hv-search">Search</label>
                  <input
                    id="hv-search"
                    aria-label="Search home visitations and conferences"
                    className="inline-search"
                    placeholder="Resident, worker, or purpose..."
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); resetPagination(); }}
                  />
                </div>
                <div className="home-visitations-filter-selects">
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="hv-resident">Resident</label>
                    <select
                      id="hv-resident"
                      aria-label="Filter resident"
                      className="inline-select"
                      value={residentFilter}
                      onChange={(event) => { setResidentFilter(event.target.value); resetPagination(); }}
                    >
                      {viewResidentOptions.map((resident) => (
                        <option key={resident.value} value={resident.value}>
                          {resident.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="hv-visit-type">Visit type</label>
                    <select
                      id="hv-visit-type"
                      aria-label="Filter visit type"
                      className="inline-select"
                      value={visitTypeFilter}
                      onChange={(event) => { setVisitTypeFilter(event.target.value); resetPagination(); }}
                    >
                      <option value="All">All types</option>
                      {visitTypeOptions.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            }
          >
            {filteredVisitations.length === 0 ? (
              <EmptyState title="No matching visits" message="Try clearing the filters or searching another worker or resident." />
            ) : (
              <>
                <DataTable
                  columns={['Resident', 'Visit date', 'Type', 'Worker', 'Cooperation', 'Flags', 'Actions']}
                  rows={pagedVisitations.map((visit) => [
                    <button className="table-link-button" key={`visit-${visit.id}`} onClick={() => setViewVisitId(visit.id)} type="button">
                      {visit.residentCode}
                    </button>,
                    formatDate(visit.visitDate),
                    <StatusBadge key={`visit-type-${visit.id}`} value={visit.visitType} />,
                    visit.socialWorker,
                    <StatusBadge key={`visit-coop-${visit.id}`} value={visit.familyCooperationLevel} />,
                    <div className="visit-flags" key={`visit-flags-${visit.id}`}>
                      {visit.safetyConcernsNoted ? <span className="visit-flag visit-flag-safety" title="Safety concern noted">Safety</span> : null}
                      {visit.followUpNeeded ? <span className="visit-flag visit-flag-followup" title="Follow-up required">Follow-up</span> : null}
                      {!visit.safetyConcernsNoted && !visit.followUpNeeded ? <span className="visit-flag-none">—</span> : null}
                    </div>,
                    <div className="table-actions" key={`visit-actions-${visit.id}`}>
                      <button className="ghost-button" onClick={() => setViewVisitId(visit.id)} type="button">View</button>
                      {canManageRecords ? (
                        <button className="ghost-button" onClick={() => openEditVisitModal(visit)} type="button">
                          Edit
                        </button>
                      ) : null}
                      {isAdmin ? (
                        <button className="ghost-button danger-button" onClick={() => void deleteVisit(visit.id)} type="button">Delete</button>
                      ) : null}
                    </div>,
                  ])}
                  emptyMessage="No home visitations match the current filters."
                />
                <Pagination
                  page={safedVisitPage}
                  totalPages={visitTotalPages}
                  totalItems={filteredVisitations.length}
                  pageSize={visitPageSize}
                  onChange={setVisitPage}
                />
              </>
            )}
          </SectionCard>

          <section className="page-grid two">
            <SectionCard
              title="Upcoming conferences"
              subtitle="See scheduled resident reviews that still need to happen."
              actions={
                residentFilter !== 'All' ? <span className="section-card-hint">Scoped to {residents.find((resident) => String(resident.id) === residentFilter)?.caseControlNumber}</span> : undefined
              }
            >
              {upcomingConferenceRecords.length === 0 ? (
                <EmptyState title="No upcoming conferences" message="There are no scheduled resident reviews for the current filters." />
              ) : (
                <>
                  <DataTable
                    columns={['Resident', 'Conference date', 'Lead worker', 'Status', 'Actions']}
                    rows={pagedUpcomingConferenceRecords.map((conference) => [
                      <button className="table-link-button" key={`conference-upcoming-${conference.id}`} onClick={() => setViewConferenceId(conference.id)} type="button">
                        {conference.residentCode}
                      </button>,
                      formatDate(conference.conferenceDate),
                      conference.leadWorker,
                      <StatusBadge key={`upcoming-conf-status-${conference.id}`} value={conference.status} />,
                      <div className="table-actions" key={`upcoming-conference-actions-${conference.id}`}>
                        <button className="ghost-button" onClick={() => setViewConferenceId(conference.id)} type="button">View</button>
                        {canManageRecords ? (
                          <button className="ghost-button" onClick={() => openEditConferenceModal(conference)} type="button">
                            Edit
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <button className="ghost-button danger-button" onClick={() => void deleteConference(conference.id)} type="button">Delete</button>
                        ) : null}
                      </div>,
                    ])}
                    emptyMessage="No upcoming conferences match the current filters."
                    caption="Upcoming resident reviews"
                  />
                  <Pagination
                    page={safeUpcomingConferencePage}
                    totalPages={upcomingConferenceTotalPages}
                    totalItems={upcomingConferenceRecords.length}
                    pageSize={conferencePageSize}
                    onChange={setUpcomingConferencePage}
                  />
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Case conference history"
              subtitle="Review prior conferences, deferred meetings, and scheduled reviews already in the past."
            >
              {conferenceHistoryRecords.length === 0 ? (
                <EmptyState title="No conference history" message="No historical conferences match the current resident and search filters." />
              ) : (
                <>
                  <DataTable
                    columns={['Resident', 'Conference date', 'Lead worker', 'Status', 'Actions']}
                    rows={pagedConferenceHistoryRecords.map((conference) => [
                      <button className="table-link-button" key={`conference-history-${conference.id}`} onClick={() => setViewConferenceId(conference.id)} type="button">
                        {conference.residentCode}
                      </button>,
                      formatDate(conference.conferenceDate),
                      conference.leadWorker,
                      <StatusBadge key={`history-conf-status-${conference.id}`} value={conference.status} />,
                      <div className="table-actions" key={`history-conference-actions-${conference.id}`}>
                        <button className="ghost-button" onClick={() => setViewConferenceId(conference.id)} type="button">View</button>
                        {canManageRecords ? (
                          <button className="ghost-button" onClick={() => openEditConferenceModal(conference)} type="button">
                            Edit
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <button className="ghost-button danger-button" onClick={() => void deleteConference(conference.id)} type="button">Delete</button>
                        ) : null}
                      </div>,
                    ])}
                    emptyMessage="No case conferences match the current filters."
                    caption="Resident case conference history"
                  />
                  <Pagination
                    page={safeConferenceHistoryPage}
                    totalPages={conferenceHistoryTotalPages}
                    totalItems={conferenceHistoryRecords.length}
                    pageSize={conferencePageSize}
                    onChange={setConferenceHistoryPage}
                  />
                </>
              )}
            </SectionCard>
          </section>
        </>
      )}

      {viewedVisit ? (
        <div className="modal-backdrop home-visitations-modal-backdrop" onClick={() => setViewVisitId(null)}>
          <div
            aria-modal="true"
            className="modal-surface home-visitations-view-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Home visit details"
          >
            <div className="resident-modal-header">
              <div>
                <p className="process-recording-modal-eyebrow">Home visitation</p>
                <h2>{viewedVisit.residentCode} visit</h2>
                <p>Review home environment observations, family cooperation, safety concerns, and follow-up actions.</p>
              </div>
              <div className="detail-panel-actions">
                {canManageRecords ? (
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setViewVisitId(null);
                      openEditVisitModal(viewedVisit);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
                <button className="ghost-button" onClick={() => setViewVisitId(null)} type="button">
                  Close
                </button>
              </div>
            </div>

            <div className="resident-modal-body">
              <section className="resident-modal-section">
                <h3>Visit snapshot</h3>
                <div className="home-visitations-detail-grid">
                  <ModalDetail label="Visit date" value={formatDate(viewedVisit.visitDate)} />
                  <ModalDetail label="Visit type" value={<StatusBadge value={viewedVisit.visitType} />} />
                  <ModalDetail label="Social worker" value={viewedVisit.socialWorker} />
                  <ModalDetail label="Family cooperation" value={<StatusBadge value={viewedVisit.familyCooperationLevel} />} />
                  <ModalDetail label="Location" value={viewedVisit.locationVisited} />
                  <ModalDetail label="Family present" value={viewedVisit.familyMembersPresent} />
                  <ModalDetail label="Safety concerns" value={viewedVisit.safetyConcernsNoted ? 'Yes — see details below' : 'None noted'} />
                  <ModalDetail label="Follow-up needed" value={viewedVisit.followUpNeeded ? 'Required' : 'Not required'} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Visit purpose and observations</h3>
                <div className="home-visitations-note-grid">
                  <ModalNarrative label="Purpose" value={viewedVisit.purpose ?? 'Not recorded.'} />
                  <ModalNarrative label="Observations about the home environment" value={viewedVisit.observations ?? 'Not recorded.'} />
                  <ModalNarrative label="Visit outcome" value={viewedVisit.visitOutcome} />
                  {viewedVisit.safetyConcernsNoted ? (
                    <ModalNarrative label="Safety concern details" value={viewedVisit.safetyConcernDetails ?? 'No details recorded.'} />
                  ) : null}
                  <ModalNarrative label="Follow-up actions" value={viewedVisit.followUpNotes ?? 'No follow-up notes recorded.'} />
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {viewedConference ? (
        <div className="modal-backdrop home-visitations-modal-backdrop" onClick={() => setViewConferenceId(null)}>
          <div
            aria-modal="true"
            className="modal-surface home-visitations-view-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Case conference details"
          >
            <div className="resident-modal-header">
              <div>
                <p className="process-recording-modal-eyebrow">Case conference</p>
                <h2>{viewedConference.residentCode} conference</h2>
                <p>Review conference history, decisions, and the next scheduled resident review.</p>
              </div>
              <div className="detail-panel-actions">
                {canManageRecords ? (
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setViewConferenceId(null);
                      openEditConferenceModal(viewedConference);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
                <button className="ghost-button" onClick={() => setViewConferenceId(null)} type="button">
                  Close
                </button>
              </div>
            </div>

            <div className="resident-modal-body">
              <section className="resident-modal-section">
                <h3>Conference snapshot</h3>
                <div className="home-visitations-detail-grid">
                  <ModalDetail label="Conference date" value={formatDate(viewedConference.conferenceDate)} />
                  <ModalDetail label="Status" value={<StatusBadge value={viewedConference.status} />} />
                  <ModalDetail label="Lead worker" value={viewedConference.leadWorker} />
                  <ModalDetail
                    label="Next review"
                    value={viewedConference.nextReviewDate ? formatDate(viewedConference.nextReviewDate) : 'No next review scheduled'}
                  />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Conference narrative</h3>
                <div className="home-visitations-note-grid">
                  <ModalNarrative label="Attendees" value={viewedConference.attendees} />
                  <ModalNarrative label="Purpose" value={viewedConference.purpose} />
                  <ModalNarrative label="Decisions made" value={viewedConference.decisionsMade} />
                  <ModalNarrative label="Follow-up actions" value={viewedConference.followUpActions} />
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {visitFormOpen ? (
        <div className="modal-backdrop home-visitations-modal-backdrop" onClick={resetVisitForm}>
          <div
            aria-modal="true"
            className="modal-surface home-visitations-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={editingVisitId ? 'Edit home visit' : 'Create home visit'}
          >
            <div className="resident-modal-header">
              <div>
                <p className="process-recording-modal-eyebrow">Field work</p>
                <h2>{editingVisitId ? 'Edit home visit' : 'Log home visit'}</h2>
                <p>Capture visit type, observations about the home environment, safety concerns, and follow-up actions.</p>
              </div>
              <button className="ghost-button" onClick={resetVisitForm} type="button">
                Close
              </button>
            </div>
            <HomeVisitationRecordForm
              visitationForm={visitationForm}
              setVisitationForm={setVisitationForm}
              residentOptions={residentOptions}
              workerOptions={workerOptions}
              locationOptions={visitLocationOptions}
              fieldErrors={visitFieldErrors}
              onSubmit={handleVisitSubmit}
              submitting={submitting === 'visit'}
              submitLabel={editingVisitId ? 'Update home visitation' : 'Create home visitation'}
            />
          </div>
        </div>
      ) : null}

      {conferenceFormOpen ? (
        <div className="modal-backdrop home-visitations-modal-backdrop" onClick={resetConferenceForm}>
          <div
            aria-modal="true"
            className="modal-surface home-visitations-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={editingConferenceId ? 'Edit case conference' : 'Create case conference'}
          >
            <div className="resident-modal-header">
              <div>
                <p className="process-recording-modal-eyebrow">Field work</p>
                <h2>{editingConferenceId ? 'Edit case conference' : 'Schedule or log case conference'}</h2>
                <p>Schedule upcoming resident reviews or log completed conference decisions without leaving this page.</p>
              </div>
              <button className="ghost-button" onClick={resetConferenceForm} type="button">
                Close
              </button>
            </div>
            <CaseConferenceRecordForm
              conferenceForm={conferenceForm}
              setConferenceForm={setConferenceForm}
              residentOptions={residentOptions}
              workerOptions={workerOptions}
              fieldErrors={conferenceFieldErrors}
              onSubmit={handleConferenceSubmit}
              submitting={submitting === 'conference'}
              submitLabel={editingConferenceId ? 'Update case conference' : 'Create case conference'}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModalDetail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="home-visitations-detail-card">
      <span>{label}</span>
      <div className="home-visitations-detail-value">{value}</div>
    </div>
  );
}

function ModalNarrative({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="home-visitations-note-card">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function mapVisitToForm(visit: HomeVisitation): HomeVisitationRequest {
  return {
    residentId: visit.residentId,
    visitDate: visit.visitDate,
    socialWorker: visit.socialWorker,
    visitType: visit.visitType,
    locationVisited: visit.locationVisited,
    familyMembersPresent: visit.familyMembersPresent,
    purpose: visit.purpose ?? '',
    observations: visit.observations ?? '',
    familyCooperationLevel: visit.familyCooperationLevel,
    safetyConcernsNoted: visit.safetyConcernsNoted,
    safetyConcernDetails: visit.safetyConcernDetails ?? '',
    followUpNeeded: visit.followUpNeeded,
    followUpNotes: visit.followUpNotes ?? '',
    visitOutcome: visit.visitOutcome,
  };
}

function mapConferenceToForm(conference: CaseConference): CaseConferenceRequest {
  return {
    residentId: conference.residentId,
    conferenceDate: conference.conferenceDate,
    leadWorker: conference.leadWorker,
    attendees: conference.attendees,
    purpose: conference.purpose,
    decisionsMade: conference.decisionsMade,
    followUpActions: conference.followUpActions,
    nextReviewDate: conference.nextReviewDate ?? '',
    status: conference.status,
  };
}

function validateHomeVisitationForm(form: HomeVisitationRequest): HomeVisitationFieldErrors {
  const errors: HomeVisitationFieldErrors = {};
  if (form.residentId <= 0) errors.residentId = 'Select a resident.';
  if (!form.visitDate) errors.visitDate = 'Enter the visit date.';
  if (!form.socialWorker.trim()) errors.socialWorker = 'Select the social worker.';
  if (!form.visitType.trim()) errors.visitType = 'Select the visit type.';
  if (!form.locationVisited.trim()) errors.locationVisited = 'Select the location visited.';
  if (!form.familyMembersPresent.trim()) errors.familyMembersPresent = 'Enter who was present.';
  if (!form.familyCooperationLevel.trim()) errors.familyCooperationLevel = 'Select the family cooperation level.';
  if (!form.visitOutcome.trim()) errors.visitOutcome = 'Enter the visit outcome.';
  if (!form.observations?.trim()) errors.observations = 'Enter the observations about the home environment.';
  if (form.safetyConcernsNoted && !form.safetyConcernDetails.trim()) {
    errors.safetyConcernDetails = 'Describe the safety concern.';
  }
  if (form.followUpNeeded && !form.followUpNotes?.trim()) {
    errors.followUpNotes = 'Enter the follow-up action.';
  }
  return errors;
}

function validateCaseConferenceForm(form: CaseConferenceRequest): CaseConferenceFieldErrors {
  const errors: CaseConferenceFieldErrors = {};
  if (form.residentId <= 0) errors.residentId = 'Select a resident.';
  if (!form.conferenceDate) errors.conferenceDate = 'Enter the conference date.';
  if (!form.leadWorker.trim()) errors.leadWorker = 'Select the lead worker.';
  if (!form.status.trim()) errors.status = 'Select the conference status.';
  if (!form.purpose.trim()) errors.purpose = 'Enter the conference purpose.';
  if (form.status !== 'Scheduled' && !form.decisionsMade.trim()) {
    errors.decisionsMade = 'Enter the conference decisions.';
  }
  if (form.status !== 'Scheduled' && !form.followUpActions.trim()) {
    errors.followUpActions = 'Enter the follow-up actions.';
  }
  return errors;
}

function extractAspNetErrors(error: unknown): Record<string, string[]> {
  if (!(error instanceof ApiError) || !error.details) return {};
  try {
    const parsed = JSON.parse(error.details) as { errors?: Record<string, string[]> };
    return parsed.errors && typeof parsed.errors === 'object' ? parsed.errors : {};
  } catch {
    return {};
  }
}

function extractHomeVisitationFieldErrors(error: unknown): HomeVisitationFieldErrors {
  const apiErrors = extractAspNetErrors(error);
  return compactFieldErrors<HomeVisitationFieldErrors>({
    residentId: apiErrors.ResidentId?.[0],
    visitDate: apiErrors.VisitDate?.[0],
    socialWorker: apiErrors.SocialWorker?.[0],
    visitType: apiErrors.VisitType?.[0],
    locationVisited: apiErrors.LocationVisited?.[0],
    familyMembersPresent: apiErrors.FamilyMembersPresent?.[0],
    purpose: apiErrors.Purpose?.[0],
    observations: apiErrors.Observations?.[0],
    familyCooperationLevel: apiErrors.FamilyCooperationLevel?.[0],
    safetyConcernDetails: apiErrors.SafetyConcernDetails?.[0],
    followUpNotes: apiErrors.FollowUpNotes?.[0],
    visitOutcome: apiErrors.VisitOutcome?.[0],
  });
}

function extractCaseConferenceFieldErrors(error: unknown): CaseConferenceFieldErrors {
  const apiErrors = extractAspNetErrors(error);
  return compactFieldErrors<CaseConferenceFieldErrors>({
    residentId: apiErrors.ResidentId?.[0],
    conferenceDate: apiErrors.ConferenceDate?.[0],
    leadWorker: apiErrors.LeadWorker?.[0],
    attendees: apiErrors.Attendees?.[0],
    purpose: apiErrors.Purpose?.[0],
    decisionsMade: apiErrors.DecisionsMade?.[0],
    followUpActions: apiErrors.FollowUpActions?.[0],
    status: apiErrors.Status?.[0],
  });
}

function compactFieldErrors<T extends Record<string, string | undefined>>(errors: T): T {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value)),
  ) as T;
}
