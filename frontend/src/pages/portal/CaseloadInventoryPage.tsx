import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { Resident, ResidentRequest, Safehouse } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';
import { sanitizeOptionalText, sanitizeText, type ValidationErrors } from '../../lib/validation';
import { createResidentForm } from './forms/residentFormDefaults';
import { ResidentRecordForm } from './forms/ResidentRecordForm';
import { validateResidentForm } from './forms/residentFormValidation';

export function CaseloadInventoryPage() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [safehouseFilter, setSafehouseFilter] = useState('All');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState('All');
  const [socialWorkerFilter, setSocialWorkerFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);
  const [residentForm, setResidentForm] = useState<ResidentRequest>(createResidentForm());
  const [residentErrors, setResidentErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadResidents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [residentData, safehouseData] = await Promise.all([api.residents(), api.safehouses()]);
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
  }, [user]);

  if (!user) return null;

  const selectedResident = residents.find((resident) => resident.id === selectedResidentId) ?? residents[0] ?? null;
  const normalizedSearch = normalizeText(deferredSearch);
  const safehouseNames = Array.from(new Set(residents.map((resident) => resident.safehouseName))).sort();
  const caseCategories = Array.from(new Set(residents.map((resident) => resident.caseCategory))).sort();
  const socialWorkers = Array.from(new Set(residents.map((resident) => resident.assignedSocialWorker))).sort();
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
    const matchesSocialWorker = socialWorkerFilter === 'All' || resident.assignedSocialWorker === socialWorkerFilter;
    const matchesRisk = riskFilter === 'All' || resident.currentRiskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesSafehouse && matchesCategory && matchesSocialWorker && matchesRisk;
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
    setResidentErrors({});
    setResidentForm(createResidentForm(safehouses[0]?.id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);
    const formErrors = validateResidentForm(residentForm);
    setResidentErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(false);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted resident form fields.' });
      return;
    }

    try {
      if (!editingResidentId) return;
      const payload = {
        ...residentForm,
        caseControlNumber: sanitizeText(residentForm.caseControlNumber),
        internalCode: sanitizeText(residentForm.internalCode),
        caseStatus: sanitizeText(residentForm.caseStatus),
        placeOfBirth: sanitizeText(residentForm.placeOfBirth),
        religion: sanitizeText(residentForm.religion),
        caseCategory: sanitizeText(residentForm.caseCategory),
        referralSource: sanitizeText(residentForm.referralSource),
        assignedSocialWorker: sanitizeText(residentForm.assignedSocialWorker),
        initialCaseAssessment: sanitizeText(residentForm.initialCaseAssessment),
        initialRiskLevel: sanitizeText(residentForm.initialRiskLevel),
        currentRiskLevel: sanitizeText(residentForm.currentRiskLevel),
        specialNeedsDiagnosis: sanitizeOptionalText(residentForm.specialNeedsDiagnosis ?? ''),
        referringAgencyPerson: sanitizeOptionalText(residentForm.referringAgencyPerson ?? ''),
        reintegrationType: sanitizeOptionalText(residentForm.reintegrationType ?? ''),
        reintegrationStatus: sanitizeOptionalText(residentForm.reintegrationStatus ?? ''),
        dateClosed: residentForm.dateClosed || null,
        restrictedNotes: sanitizeOptionalText(residentForm.restrictedNotes ?? ''),
        interventionPlans: residentForm.interventionPlans.map((plan) => ({
          ...plan,
          planCategory: sanitizeText(plan.planCategory),
          planDescription: sanitizeText(plan.planDescription),
          servicesProvided: sanitizeText(plan.servicesProvided),
          status: sanitizeText(plan.status),
          targetValue: plan.targetValue || null,
          caseConferenceDate: plan.caseConferenceDate || null,
        })),
      };

      await api.updateResident(editingResidentId, payload);
      setFeedback({ tone: 'success', message: 'Resident updated.' });

      resetResidentForm();
      await loadResidents();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Resident save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteResident = async (id: number) => {
    if (!user || !window.confirm('Delete this resident record? This action requires confirmation.')) return;
    try {
      await api.deleteResident(id);
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
          <div className="page-header-actions">
            <Link className="ghost-button" to="/portal/caseload/new">
              New case
            </Link>
          </div>
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
                  <select className="inline-select" value={socialWorkerFilter} onChange={(e) => setSocialWorkerFilter(e.target.value)}><option>All</option>{socialWorkers.map((worker) => <option key={worker}>{worker}</option>)}</select>
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
                    <StatusBadge key={`status-${resident.id}`} value={resident.caseStatus} />,
                    <StatusBadge key={`risk-${resident.id}`} value={resident.currentRiskLevel} />,
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

          {isAdmin && editingResidentId ? (
            <SectionCard
              title="Edit resident"
              subtitle="Keep the current intervention direction visible while maintaining a focused resident intake and update workflow."
              actions={
                <button className="ghost-button" onClick={resetResidentForm} type="button">
                  Cancel edit
                </button>
              }
            >
              <ResidentRecordForm
                residentForm={residentForm}
                setResidentForm={setResidentForm}
                residentErrors={residentErrors}
                safehouses={safehouses}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitLabel="Update resident"
              />
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
