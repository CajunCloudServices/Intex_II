import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { Resident, ResidentRequest, Safehouse } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { SectionCard } from '../../components/ui/Cards';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';

function createResidentForm(safehouseId?: number): ResidentRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    caseControlNumber: '',
    internalCode: '',
    safehouseId: safehouseId ?? 1,
    caseStatus: 'Active',
    dateOfBirth: '2011-01-01',
    placeOfBirth: '',
    religion: '',
    caseCategory: 'Neglected',
    isTrafficked: false,
    isPhysicalAbuseCase: false,
    isSexualAbuseCase: false,
    hasSpecialNeeds: false,
    specialNeedsDiagnosis: '',
    familyIs4Ps: false,
    familySoloParent: false,
    familyIndigenous: false,
    familyInformalSettler: false,
    dateOfAdmission: today,
    referralSource: 'Government Agency',
    referringAgencyPerson: '',
    assignedSocialWorker: '',
    initialCaseAssessment: '',
    reintegrationType: '',
    reintegrationStatus: '',
    initialRiskLevel: 'Medium',
    currentRiskLevel: 'Medium',
    dateClosed: '',
    restrictedNotes: '',
    interventionPlans: [
      {
        planCategory: 'Psychosocial',
        planDescription: '',
        servicesProvided: '',
        targetValue: null,
        targetDate: today,
        status: 'Open',
        caseConferenceDate: '',
      },
    ],
  };
}

export function CaseloadInventoryPage() {
  const { token, user } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [safehouseFilter, setSafehouseFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);
  const [residentForm, setResidentForm] = useState<ResidentRequest>(createResidentForm());
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadResidents = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [residentData, safehouseData] = await Promise.all([api.residents(token), api.safehouses(token)]);
      setResidents(residentData);
      setSafehouses(safehouseData);
      setSelectedResidentId((current) => current ?? residentData[0]?.id ?? null);
      setResidentForm((current) => current.safehouseId > 0 ? current : createResidentForm(safehouseData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load residents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResidents();
  }, [token]);

  if (!token) return null;

  const selectedResident = residents.find((resident) => resident.id === selectedResidentId) ?? residents[0] ?? null;
  const normalizedSearch = normalizeText(deferredSearch);
  const safehouseNames = Array.from(new Set(residents.map((resident) => resident.safehouseName))).sort();
  const filteredResidents = residents.filter((resident) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(resident.caseControlNumber).includes(normalizedSearch) ||
      normalizeText(resident.safehouseName).includes(normalizedSearch) ||
      normalizeText(resident.assignedSocialWorker).includes(normalizedSearch) ||
      normalizeText(resident.caseCategory).includes(normalizedSearch);
    const matchesStatus = statusFilter === 'All' || resident.caseStatus === statusFilter;
    const matchesSafehouse = safehouseFilter === 'All' || resident.safehouseName === safehouseFilter;
    const matchesRisk = riskFilter === 'All' || resident.currentRiskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesSafehouse && matchesRisk;
  });

  const activeCount = residents.filter((resident) => resident.caseStatus === 'Active').length;
  const highRiskCount = residents.filter((resident) => resident.currentRiskLevel === 'High' || resident.currentRiskLevel === 'Critical').length;
  const planCount = residents.reduce((sum, resident) => sum + resident.interventionPlans.length, 0);
  const archivedThisWeekCount = residents.filter((resident) => {
    if (!resident.dateClosed) return false;
    const closedTime = new Date(resident.dateClosed).getTime();
    return Number.isFinite(closedTime) && Date.now() - closedTime <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const resetResidentForm = () => {
    setEditingResidentId(null);
    setResidentForm(createResidentForm(safehouses[0]?.id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        ...residentForm,
        specialNeedsDiagnosis: residentForm.specialNeedsDiagnosis || null,
        referringAgencyPerson: residentForm.referringAgencyPerson || null,
        reintegrationType: residentForm.reintegrationType || null,
        reintegrationStatus: residentForm.reintegrationStatus || null,
        dateClosed: residentForm.dateClosed || null,
        restrictedNotes: residentForm.restrictedNotes || null,
        interventionPlans: residentForm.interventionPlans.map((plan) => ({
          ...plan,
          targetValue: plan.targetValue || null,
          caseConferenceDate: plan.caseConferenceDate || null,
        })),
      };

      if (editingResidentId) {
        await api.updateResident(token, editingResidentId, payload);
        setFeedback({ tone: 'success', message: 'Resident updated.' });
      } else {
        await api.createResident(token, payload);
        setFeedback({ tone: 'success', message: 'Resident created.' });
      }

      resetResidentForm();
      await loadResidents();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Resident save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteResident = async (id: number) => {
    if (!token || !window.confirm('Delete this resident record? This action requires confirmation.')) return;
    try {
      await api.deleteResident(token, id);
      setFeedback({ tone: 'success', message: 'Resident deleted.' });
      if (selectedResidentId === id) setSelectedResidentId(null);
      await loadResidents();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Resident delete failed.' });
    }
  };

  return (
    <div className="page-shell caseload-page">
      <div className="caseload-header">
        <div>
          <div className="caseload-breadcrumb">Archive / Current Quarter</div>
          <h1>Active Caseload Archive</h1>
          <p>Manage resident records, risk signals, and one starter intervention plan directly in the portal.</p>
        </div>
        {isAdmin ? (
          <button
            className="primary-button"
            onClick={() => {
              resetResidentForm();
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
            type="button"
          >
            New Case
          </button>
        ) : null}
      </div>

      <section className="caseload-stats" aria-label="Caseload summary">
        <article className="caseload-stat-card">
          <span>Total Active</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="caseload-stat-card">
          <span>Urgent Action</span>
          <strong className="caseload-stat-alert">{highRiskCount}</strong>
        </article>
        <article className="caseload-stat-card caseload-stat-card-highlight">
          <span>In Progress</span>
          <strong>{planCount}</strong>
        </article>
        <article className="caseload-stat-card">
          <span>Archived This Week</span>
          <strong>{archivedThisWeekCount}</strong>
        </article>
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading caseload..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadResidents} />
      ) : (
        <>
          <section className="caseload-archive-shell">
            <div className="caseload-controls">
              <div className="caseload-control-group">
                <input
                  className="inline-search"
                  placeholder="Filter by name or case ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="inline-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>All</option>
                  <option>Active</option>
                  <option>Closed</option>
                  <option>Transferred</option>
                </select>
                <select className="inline-select" value={safehouseFilter} onChange={(e) => setSafehouseFilter(e.target.value)}>
                  <option>All</option>
                  {safehouseNames.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <select className="inline-select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                  <option>All</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div className="caseload-showing">
                Showing <strong>{filteredResidents.length}</strong> of {residents.length} entries
              </div>
            </div>

            <div className="caseload-table-shell">
              {filteredResidents.length === 0 ? (
                <EmptyState title="No matching residents" message="Try clearing one of the filters or searching another term." />
              ) : (
                <div className="caseload-table-wrap">
                  <table className="caseload-table">
                    <thead>
                      <tr>
                        <th>Case Profile</th>
                        <th>Primary Advocate</th>
                        <th>Status Flag</th>
                        <th>Last Activity</th>
                        <th>Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResidents.map((resident) => (
                        <tr
                          key={resident.id}
                          className={selectedResidentId === resident.id ? 'is-selected' : ''}
                          onClick={() => setSelectedResidentId(resident.id)}
                        >
                          <td>
                            <div className="caseload-profile">
                              <div className={`caseload-avatar${resident.currentRiskLevel === 'Critical' || resident.currentRiskLevel === 'High' ? ' caseload-avatar-alert' : ''}`}>
                                {resident.caseControlNumber.slice(0, 2)}
                              </div>
                              <div>
                                <button
                                  className="table-link-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedResidentId(resident.id);
                                  }}
                                  type="button"
                                >
                                  {resident.caseControlNumber}
                                </button>
                                <div className="caseload-profile-meta">
                                  {resident.safehouseName} • {resident.caseCategory}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{resident.assignedSocialWorker}</td>
                          <td>
                            <span
                              className={`caseload-pill${
                                resident.currentRiskLevel === 'Critical' || resident.currentRiskLevel === 'High'
                                  ? ' caseload-pill-alert'
                                  : resident.caseStatus === 'Closed'
                                    ? ' caseload-pill-muted'
                                    : ' caseload-pill-progress'
                              }`}
                            >
                              {resident.currentRiskLevel === 'Critical' || resident.currentRiskLevel === 'High'
                                ? 'Urgent Action'
                                : resident.caseStatus === 'Closed'
                                  ? 'Archived'
                                  : 'In Progress'}
                            </span>
                          </td>
                          <td>{resident.dateClosed ? formatDate(resident.dateClosed) : formatDate(resident.dateOfAdmission)}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="ghost-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedResidentId(resident.id);
                                }}
                                type="button"
                              >
                                View
                              </button>
                              {isAdmin ? (
                                <>
                                  <button
                                    className="ghost-button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setEditingResidentId(resident.id);
                                      setResidentForm({
                                        caseControlNumber: resident.caseControlNumber,
                                        internalCode: resident.internalCode,
                                        safehouseId: resident.safehouseId,
                                        caseStatus: resident.caseStatus,
                                        dateOfBirth: resident.dateOfBirth,
                                        placeOfBirth: resident.placeOfBirth,
                                        religion: resident.religion,
                                        caseCategory: resident.caseCategory,
                                        isTrafficked: resident.isTrafficked,
                                        isPhysicalAbuseCase: resident.isPhysicalAbuseCase,
                                        isSexualAbuseCase: resident.isSexualAbuseCase,
                                        hasSpecialNeeds: resident.hasSpecialNeeds,
                                        specialNeedsDiagnosis: resident.specialNeedsDiagnosis ?? '',
                                        familyIs4Ps: resident.familyIs4Ps,
                                        familySoloParent: resident.familySoloParent,
                                        familyIndigenous: resident.familyIndigenous,
                                        familyInformalSettler: resident.familyInformalSettler,
                                        dateOfAdmission: resident.dateOfAdmission,
                                        referralSource: resident.referralSource,
                                        referringAgencyPerson: resident.referringAgencyPerson ?? '',
                                        assignedSocialWorker: resident.assignedSocialWorker,
                                        initialCaseAssessment: resident.initialCaseAssessment,
                                        reintegrationType: resident.reintegrationType ?? '',
                                        reintegrationStatus: resident.reintegrationStatus ?? '',
                                        initialRiskLevel: resident.initialRiskLevel,
                                        currentRiskLevel: resident.currentRiskLevel,
                                        dateClosed: resident.dateClosed ?? '',
                                        restrictedNotes: resident.restrictedNotes ?? '',
                                        interventionPlans:
                                          resident.interventionPlans.length > 0
                                            ? resident.interventionPlans.map((plan) => ({
                                                planCategory: plan.planCategory,
                                                planDescription: plan.planDescription,
                                                servicesProvided: plan.servicesProvided,
                                                targetValue: plan.targetValue ?? null,
                                                targetDate: plan.targetDate,
                                                status: plan.status,
                                                caseConferenceDate: plan.caseConferenceDate ?? '',
                                              }))
                                            : createResidentForm(safehouses[0]?.id).interventionPlans,
                                      });
                                    }}
                                    type="button"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="ghost-button danger-button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void deleteResident(resident.id);
                                    }}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="caseload-pagination">
                <button className="text-button" type="button">
                  Previous
                </button>
                <div className="caseload-pagination-pages">
                  <span className="is-active">1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>...</span>
                  <span>9</span>
                </div>
                <button className="text-button" type="button">
                  Next
                </button>
              </div>
            </div>

            <DetailPanel title={selectedResident?.caseControlNumber ?? 'Resident details'} subtitle="Use the detail panel during demos to explain the case record structure.">
              {selectedResident ? (
                <DetailList
                  items={[
                    { label: 'Safehouse', value: selectedResident.safehouseName },
                    { label: 'Category', value: selectedResident.caseCategory },
                    { label: 'Risk', value: selectedResident.currentRiskLevel },
                    { label: 'Social worker', value: selectedResident.assignedSocialWorker },
                    { label: 'Referral source', value: selectedResident.referralSource },
                    { label: 'Admitted', value: formatDate(selectedResident.dateOfAdmission) },
                    { label: 'Starter plan', value: selectedResident.interventionPlans[0]?.planDescription ?? 'No plan recorded' },
                  ]}
                />
              ) : (
                <EmptyState title="No resident selected" message="Choose a resident to inspect the case details." />
              )}
            </DetailPanel>
          </section>

          {isAdmin ? (
            <SectionCard
              title={editingResidentId ? 'Edit resident' : 'Create resident'}
              subtitle="This starter keeps one intervention plan in the form so the structure stays understandable."
              actions={editingResidentId ? <button className="ghost-button" onClick={resetResidentForm} type="button">Cancel edit</button> : null}
            >
              <form className="stack-form" onSubmit={handleSubmit}>
                <FormSection title="Core case information">
                  <FormGrid>
                    <label><span>Case control number</span><input value={residentForm.caseControlNumber} onChange={(e) => setResidentForm({ ...residentForm, caseControlNumber: e.target.value })} required /></label>
                    <label><span>Internal code</span><input value={residentForm.internalCode} onChange={(e) => setResidentForm({ ...residentForm, internalCode: e.target.value })} required /></label>
                    <label><span>Safehouse</span><select value={residentForm.safehouseId} onChange={(e) => setResidentForm({ ...residentForm, safehouseId: Number(e.target.value) })}>{safehouses.map((safehouse) => <option key={safehouse.id} value={safehouse.id}>{safehouse.name}</option>)}</select></label>
                    <label><span>Case status</span><input value={residentForm.caseStatus} onChange={(e) => setResidentForm({ ...residentForm, caseStatus: e.target.value })} required /></label>
                    <label><span>Date of birth</span><input type="date" value={residentForm.dateOfBirth} onChange={(e) => setResidentForm({ ...residentForm, dateOfBirth: e.target.value })} required /></label>
                    <label><span>Date of admission</span><input type="date" value={residentForm.dateOfAdmission} onChange={(e) => setResidentForm({ ...residentForm, dateOfAdmission: e.target.value })} required /></label>
                    <label><span>Place of birth</span><input value={residentForm.placeOfBirth} onChange={(e) => setResidentForm({ ...residentForm, placeOfBirth: e.target.value })} required /></label>
                    <label><span>Religion</span><input value={residentForm.religion} onChange={(e) => setResidentForm({ ...residentForm, religion: e.target.value })} required /></label>
                    <label><span>Case category</span><input value={residentForm.caseCategory} onChange={(e) => setResidentForm({ ...residentForm, caseCategory: e.target.value })} required /></label>
                    <label><span>Referral source</span><input value={residentForm.referralSource} onChange={(e) => setResidentForm({ ...residentForm, referralSource: e.target.value })} required /></label>
                    <label><span>Assigned social worker</span><input value={residentForm.assignedSocialWorker} onChange={(e) => setResidentForm({ ...residentForm, assignedSocialWorker: e.target.value })} required /></label>
                    <label><span>Referring person</span><input value={residentForm.referringAgencyPerson ?? ''} onChange={(e) => setResidentForm({ ...residentForm, referringAgencyPerson: e.target.value })} /></label>
                  </FormGrid>
                </FormSection>

                <FormSection title="Risk and flags">
                  <FormGrid>
                    <label><span>Initial risk</span><input value={residentForm.initialRiskLevel} onChange={(e) => setResidentForm({ ...residentForm, initialRiskLevel: e.target.value })} required /></label>
                    <label><span>Current risk</span><input value={residentForm.currentRiskLevel} onChange={(e) => setResidentForm({ ...residentForm, currentRiskLevel: e.target.value })} required /></label>
                    <label><span>Reintegration type</span><input value={residentForm.reintegrationType ?? ''} onChange={(e) => setResidentForm({ ...residentForm, reintegrationType: e.target.value })} /></label>
                    <label><span>Reintegration status</span><input value={residentForm.reintegrationStatus ?? ''} onChange={(e) => setResidentForm({ ...residentForm, reintegrationStatus: e.target.value })} /></label>
                  </FormGrid>
                  <div className="check-grid">
                    <CheckboxField label="Trafficked" checked={residentForm.isTrafficked} onChange={(checked) => setResidentForm({ ...residentForm, isTrafficked: checked })} />
                    <CheckboxField label="Physical abuse case" checked={residentForm.isPhysicalAbuseCase} onChange={(checked) => setResidentForm({ ...residentForm, isPhysicalAbuseCase: checked })} />
                    <CheckboxField label="Sexual abuse case" checked={residentForm.isSexualAbuseCase} onChange={(checked) => setResidentForm({ ...residentForm, isSexualAbuseCase: checked })} />
                    <CheckboxField label="Special needs" checked={residentForm.hasSpecialNeeds} onChange={(checked) => setResidentForm({ ...residentForm, hasSpecialNeeds: checked })} />
                    <CheckboxField label="Family is 4Ps" checked={residentForm.familyIs4Ps} onChange={(checked) => setResidentForm({ ...residentForm, familyIs4Ps: checked })} />
                    <CheckboxField label="Solo parent family" checked={residentForm.familySoloParent} onChange={(checked) => setResidentForm({ ...residentForm, familySoloParent: checked })} />
                    <CheckboxField label="Indigenous family" checked={residentForm.familyIndigenous} onChange={(checked) => setResidentForm({ ...residentForm, familyIndigenous: checked })} />
                    <CheckboxField label="Informal settler family" checked={residentForm.familyInformalSettler} onChange={(checked) => setResidentForm({ ...residentForm, familyInformalSettler: checked })} />
                  </div>
                </FormSection>

                <FormSection title="Starter intervention plan">
                  <FormGrid>
                    <label><span>Plan category</span><input value={residentForm.interventionPlans[0]?.planCategory ?? ''} onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], planCategory: e.target.value }] })} required /></label>
                    <label><span>Status</span><input value={residentForm.interventionPlans[0]?.status ?? ''} onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], status: e.target.value }] })} required /></label>
                    <label><span>Target date</span><input type="date" value={residentForm.interventionPlans[0]?.targetDate ?? ''} onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], targetDate: e.target.value }] })} required /></label>
                    <label><span>Services provided</span><input value={residentForm.interventionPlans[0]?.servicesProvided ?? ''} onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], servicesProvided: e.target.value }] })} required /></label>
                  </FormGrid>
                  <label><span>Plan description</span><textarea value={residentForm.interventionPlans[0]?.planDescription ?? ''} onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], planDescription: e.target.value }] })} rows={3} required /></label>
                </FormSection>

                <label><span>Initial case assessment</span><textarea value={residentForm.initialCaseAssessment} onChange={(e) => setResidentForm({ ...residentForm, initialCaseAssessment: e.target.value })} rows={3} required /></label>
                <label><span>Restricted notes</span><textarea value={residentForm.restrictedNotes ?? ''} onChange={(e) => setResidentForm({ ...residentForm, restrictedNotes: e.target.value })} rows={3} /></label>
                <div className="form-actions">
                  <button className="primary-button" disabled={submitting} type="submit">
                    {submitting ? 'Saving...' : editingResidentId ? 'Update resident' : 'Create resident'}
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
