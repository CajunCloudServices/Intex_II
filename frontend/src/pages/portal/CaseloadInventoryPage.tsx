import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { Resident, ResidentRequest, Safehouse } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
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
  const [caseCategoryFilter, setCaseCategoryFilter] = useState('All');
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
  const caseCategories = Array.from(new Set(residents.map((resident) => resident.caseCategory))).sort();
  const filteredResidents = residents.filter((resident) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(resident.caseControlNumber).includes(normalizedSearch) ||
      normalizeText(resident.safehouseName).includes(normalizedSearch) ||
      normalizeText(resident.assignedSocialWorker).includes(normalizedSearch) ||
      normalizeText(resident.caseCategory).includes(normalizedSearch);
    const matchesStatus = statusFilter === 'All' || resident.caseStatus === statusFilter;
    const matchesSafehouse = safehouseFilter === 'All' || resident.safehouseName === safehouseFilter;
    const matchesCategory = caseCategoryFilter === 'All' || resident.caseCategory === caseCategoryFilter;
    const matchesRisk = riskFilter === 'All' || resident.currentRiskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesSafehouse && matchesCategory && matchesRisk;
  });

  const activeCount = residents.filter((resident) => resident.caseStatus === 'Active').length;
  const highRiskCount = residents.filter((resident) => resident.currentRiskLevel === 'High' || resident.currentRiskLevel === 'Critical').length;
  const planCount = residents.reduce((sum, resident) => sum + resident.interventionPlans.length, 0);

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
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Case management</span>
          <h1>Caseload inventory</h1>
          <p>Manage resident records, family context, risk signals, and intervention planning from one case-management view.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Active residents" value={String(activeCount)} detail="Current open caseload." accent />
        <MetricCard label="High-risk cases" value={String(highRiskCount)} detail="Residents that need closer review." />
        <MetricCard label="Intervention plans" value={String(planCount)} detail="Starter plan rows connected to current residents." />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading caseload..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadResidents} />
      ) : (
        <>
          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Resident inventory"
              subtitle={isAdmin ? 'Admins can update or delete cases. Staff can review and filter them.' : 'Staff can review and filter case records.'}
              actions={
                <div className="filter-row">
                  <input className="inline-search" placeholder="Search residents..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select className="inline-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option><option>Active</option><option>Closed</option><option>Transferred</option></select>
                  <select className="inline-select" value={safehouseFilter} onChange={(e) => setSafehouseFilter(e.target.value)}><option>All</option>{safehouseNames.map((name) => <option key={name}>{name}</option>)}</select>
                  <select className="inline-select" value={caseCategoryFilter} onChange={(e) => setCaseCategoryFilter(e.target.value)}><option>All</option>{caseCategories.map((category) => <option key={category}>{category}</option>)}</select>
                  <select className="inline-select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
                </div>
              }
            >
              {filteredResidents.length === 0 ? (
                <EmptyState title="No matching residents" message="Try clearing one of the filters or searching another term." />
              ) : (
                <DataTable
                  caption="Resident records"
                  columns={['Case #', 'Safehouse', 'Status', 'Risk', 'Worker', 'Actions']}
                  rows={filteredResidents.map((resident) => [
                    <button className="table-link-button" key={`case-${resident.id}`} onClick={() => setSelectedResidentId(resident.id)} type="button">{resident.caseControlNumber}</button>,
                    resident.safehouseName,
                    resident.caseStatus,
                    resident.currentRiskLevel,
                    resident.assignedSocialWorker,
                    <div className="table-actions" key={`actions-${resident.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedResidentId(resident.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
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
                                interventionPlans: resident.interventionPlans.length > 0
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
                          <button className="ghost-button danger-button" onClick={() => void deleteResident(resident.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                />
              )}
            </SectionCard>

            <DetailPanel title={selectedResident?.caseControlNumber ?? 'Resident details'} subtitle="Review demographics, referral context, risk, and the current intervention direction for this resident.">
              {selectedResident ? (
                <DetailList
                  items={[
                    { label: 'Safehouse', value: selectedResident.safehouseName },
                    { label: 'Category', value: selectedResident.caseCategory },
                    { label: 'Risk', value: selectedResident.currentRiskLevel },
                    { label: 'Social worker', value: selectedResident.assignedSocialWorker },
                    { label: 'Referral source', value: selectedResident.referralSource },
                    { label: 'Admitted', value: formatDate(selectedResident.dateOfAdmission) },
                    { label: 'Reintegration', value: selectedResident.reintegrationStatus ?? 'Not yet set' },
                    { label: '4Ps beneficiary', value: selectedResident.familyIs4Ps ? 'Yes' : 'No' },
                    { label: 'Special needs', value: selectedResident.hasSpecialNeeds ? (selectedResident.specialNeedsDiagnosis ?? 'Yes') : 'No' },
                    { label: 'Intervention plan', value: selectedResident.interventionPlans[0]?.planDescription ?? 'No plan recorded' },
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
