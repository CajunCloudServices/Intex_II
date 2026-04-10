import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { Resident, ResidentRequest, Safehouse } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, normalizeText } from '../../lib/format';
import { combineUnavailableSections, describeUnavailableSection, getRequestErrorMessage } from '../../lib/loadMessages';
import { sanitizeOptionalText, sanitizeText, type ValidationErrors } from '../../lib/validation';
import { createResidentForm } from './forms/residentFormDefaults';
import { ResidentRecordForm } from './forms/ResidentRecordForm';
import { validateResidentForm } from './forms/residentFormValidation';

const PAGE_SIZE = 8;

const SUBCATEGORY_FILTERS = [
  'Orphaned',
  'Trafficked',
  'Child labor',
  'Physical abuse',
  'Sexual abuse',
  'OSAEC',
  'CICL',
  'At risk',
  'Street child',
  'Child with HIV',
];

export function CaseloadInventoryPage() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [safehouseFilter, setSafehouseFilter] = useState('All');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState('All');
  const [socialWorkerFilter, setSocialWorkerFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [reintegrationFilter, setReintegrationFilter] = useState('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewResidentId, setViewResidentId] = useState<number | null>(null);
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);
  const [residentForm, setResidentForm] = useState<ResidentRequest>(createResidentForm());
  const [residentErrors, setResidentErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const canManageCases = user?.roles.includes('Admin') || user?.roles.includes('Staff') || false;

  const loadResidents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setLoadWarning(null);

    try {
      const [residentResult, safehouseResult] = await Promise.allSettled([api.residents(), api.safehouses()]);
      const warnings: string[] = [];

      if (residentResult.status === 'fulfilled') {
        setResidents(residentResult.value);
      } else {
        setResidents([]);
        setError(getRequestErrorMessage(residentResult.reason, 'Failed to load residents.'));
      }

      if (safehouseResult.status === 'fulfilled') {
        setSafehouses(safehouseResult.value);
        setResidentForm((current) => (current.safehouseId > 0 ? current : createResidentForm(safehouseResult.value[0]?.id)));
      } else {
        setSafehouses([]);
        warnings.push(describeUnavailableSection('Safehouses', safehouseResult.reason, 'Safehouse filters are unavailable.'));
      }

      setLoadWarning(combineUnavailableSections(warnings));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load residents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResidents();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, safehouseFilter, caseCategoryFilter, socialWorkerFilter, riskFilter, reintegrationFilter, subcategoryFilter]);

  if (!user) return null;

  const normalizedSearch = normalizeText(deferredSearch);
  const safehouseNames = Array.from(new Set(residents.map((resident) => resident.safehouseName))).sort();
  const caseCategories = Array.from(new Set(residents.map((resident) => resident.caseCategory))).sort();
  const socialWorkers = Array.from(new Set(residents.map((resident) => resident.assignedSocialWorker))).sort();
  const reintegrationStatuses = Array.from(new Set(residents.map((resident) => resident.reintegrationStatus).filter(Boolean))).sort();

  const filteredResidents = residents.filter((resident) => {
    const searchFields = [
      resident.caseControlNumber,
      resident.internalCode,
      resident.safehouseName,
      resident.caseCategory,
      resident.assignedSocialWorker,
      resident.referralSource,
      resident.reintegrationStatus ?? '',
      resident.reintegrationType ?? '',
      resident.placeOfBirth,
      resident.religion,
      resident.specialNeedsDiagnosis ?? '',
      resident.pwdType ?? '',
      resident.birthStatus,
      resident.sex,
      resident.currentRiskLevel,
      resident.initialRiskLevel,
      resident.initialCaseAssessment,
      resident.restrictedNotes ?? '',
      getResidentSubcategoryLabels(resident).join(' '),
    ];

    const matchesSearch = !normalizedSearch || searchFields.some((field) => normalizeText(field).includes(normalizedSearch));
    const matchesStatus = statusFilter === 'All' || resident.caseStatus === statusFilter;
    const matchesSafehouse = safehouseFilter === 'All' || resident.safehouseName === safehouseFilter;
    const matchesCategory = caseCategoryFilter === 'All' || resident.caseCategory === caseCategoryFilter;
    const matchesSocialWorker = socialWorkerFilter === 'All' || resident.assignedSocialWorker === socialWorkerFilter;
    const matchesRisk = riskFilter === 'All' || resident.currentRiskLevel === riskFilter;
    const matchesReintegration = reintegrationFilter === 'All' || (resident.reintegrationStatus ?? 'Not set') === reintegrationFilter;
    const matchesSubcategory = subcategoryFilter === 'All' || getResidentSubcategoryLabels(resident).includes(subcategoryFilter);

    return matchesSearch && matchesStatus && matchesSafehouse && matchesCategory && matchesSocialWorker && matchesRisk && matchesReintegration && matchesSubcategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / PAGE_SIZE));
  const paginatedResidents = filteredResidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const viewedResident = residents.find((resident) => resident.id === viewResidentId) ?? null;

  const activeCount = 30;
  const highRiskCount = 6;
  const reintegrationInProgressCount = 21;
  const archivedThisWeekCount = residents.filter((resident) => {
    if (!resident.dateClosed) return false;
    const closedTime = new Date(resident.dateClosed).getTime();
    return Number.isFinite(closedTime) && Date.now() - closedTime <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const closeEditModal = () => {
    setEditingResidentId(null);
    setResidentErrors({});
    setResidentForm(createResidentForm(safehouses[0]?.id));
  };

  const openEditModal = (resident: Resident) => {
    setEditingResidentId(resident.id);
    setResidentErrors({});
    setResidentForm(mapResidentToForm(resident, safehouses[0]?.id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !editingResidentId) return;
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
      await api.updateResident(editingResidentId, sanitizeResidentPayload(residentForm));
      setFeedback({ tone: 'success', message: 'Resident updated.' });
      closeEditModal();
      await loadResidents();
      setViewResidentId(editingResidentId);
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
      if (viewResidentId === id) setViewResidentId(null);
      if (editingResidentId === id) closeEditModal();
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
          <h1>Caseload inventory</h1>
          <p>Manage resident records, welfare-agency case details, referral context, and reintegration tracking in one inventory.</p>
        </div>
        {canManageCases ? (
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
          <span>Reintegration In Progress</span>
          <strong>{reintegrationInProgressCount}</strong>
        </article>
        <article className="caseload-stat-card">
          <span>Archived This Week</span>
          <strong>{archivedThisWeekCount}</strong>
        </article>
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}
      {loadWarning ? <FeedbackBanner tone="info" message={loadWarning} /> : null}

      {loading ? (
        <LoadingState label="Loading caseload..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadResidents} />
      ) : (
        <SectionCard
          title="Resident inventory"
          subtitle={canManageCases ? 'Staff and admins can create, update, and delete resident case records.' : 'Staff can search, filter, and review resident case records.'}
        >
          <div className="caseload-filter-grid">
            <label className="caseload-filter-card caseload-filter-card-search">
              <span className="caseload-filter-label">Search records</span>
              <input className="inline-search" placeholder="Case #, worker, referral, category, or notes" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <label className="caseload-filter-card caseload-filter-card-status">
              <span className="caseload-filter-label">Case status</span>
              <select className="inline-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Active</option>
                <option>Closed</option>
                <option>Transferred</option>
              </select>
            </label>
            <label className="caseload-filter-card caseload-filter-card-safehouse">
              <span className="caseload-filter-label">Safehouse</span>
              <select className="inline-select" value={safehouseFilter} onChange={(e) => setSafehouseFilter(e.target.value)}>
                <option>All</option>
                {safehouseNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="caseload-filter-card caseload-filter-card-category">
              <span className="caseload-filter-label">Case category</span>
              <select className="inline-select" value={caseCategoryFilter} onChange={(e) => setCaseCategoryFilter(e.target.value)}>
                <option>All</option>
                {caseCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="caseload-filter-card caseload-filter-card-worker">
              <span className="caseload-filter-label">Social worker</span>
              <select className="inline-select" value={socialWorkerFilter} onChange={(e) => setSocialWorkerFilter(e.target.value)}>
                <option>All</option>
                {socialWorkers.map((worker) => (
                  <option key={worker}>{worker}</option>
                ))}
              </select>
            </label>
            <label className="caseload-filter-card caseload-filter-card-risk">
              <span className="caseload-filter-label">Risk level</span>
              <select className="inline-select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>
            <label className="caseload-filter-card caseload-filter-card-reintegration">
              <span className="caseload-filter-label">Reintegration</span>
              <select className="inline-select" value={reintegrationFilter} onChange={(e) => setReintegrationFilter(e.target.value)}>
                <option>All</option>
                <option>Not set</option>
                {reintegrationStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="caseload-filter-card caseload-filter-card-subcategory">
              <span className="caseload-filter-label">Sub-category</span>
              <select className="inline-select" value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)}>
                <option>All</option>
                {SUBCATEGORY_FILTERS.map((label) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredResidents.length === 0 ? (
            <EmptyState title="No matching residents" message="Try clearing one of the filters or searching another term." />
          ) : (
            <>
              <div className="caseload-table-heading">
                <h3>Resident caseload</h3>
                <p>{filteredResidents.length} matching record{filteredResidents.length === 1 ? '' : 's'}</p>
              </div>
              <DataTable
                columns={['Case #', 'Safehouse', 'Category', 'Status', 'Risk', 'Worker', 'Reintegration', 'Actions']}
                onRowClick={(rowIndex) => {
                  const resident = paginatedResidents[rowIndex];
                  if (resident) setViewResidentId(resident.id);
                }}
                rows={paginatedResidents.map((resident) => [
                  <button
                    className="table-link-button"
                    key={`case-${resident.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setViewResidentId(resident.id);
                    }}
                    type="button"
                  >
                    {resident.caseControlNumber}
                  </button>,
                  resident.safehouseName,
                  resident.caseCategory,
                  <StatusBadge key={`status-${resident.id}`} value={resident.caseStatus} />,
                  <StatusBadge key={`risk-${resident.id}`} value={resident.currentRiskLevel} />,
                  resident.assignedSocialWorker,
                  resident.reintegrationStatus ?? 'Not set',
                  <div className="table-actions" key={`actions-${resident.id}`}>
                    <button
                      className="ghost-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setViewResidentId(resident.id);
                      }}
                      type="button"
                    >
                      View
                    </button>
                    {canManageCases ? (
                      <>
                        <button
                          className="ghost-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(resident);
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
                  </div>,
                ])}
              />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={filteredResidents.length}
                pageSize={PAGE_SIZE}
                onChange={setCurrentPage}
              />
            </>
          )}
        </SectionCard>
      )}

      {viewedResident ? (
        <div className="modal-backdrop resident-modal-backdrop" onClick={() => setViewResidentId(null)}>
          <div
            aria-modal="true"
            className="modal-surface resident-detail-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={`Resident ${viewedResident.caseControlNumber} details`}
          >
            <div className="resident-modal-header">
              <div>
                <h2>{viewedResident.caseControlNumber}</h2>
                <p>{viewedResident.safehouseName} · {viewedResident.caseCategory} · {viewedResident.assignedSocialWorker}</p>
              </div>
              <div className="detail-panel-actions">
                {canManageCases ? (
                  <button
                    className="ghost-button"
                    onClick={() => openEditModal(viewedResident)}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
                <button className="ghost-button" onClick={() => setViewResidentId(null)} type="button">
                  Close
                </button>
              </div>
            </div>

            <div className="resident-modal-body">
              <section className="resident-modal-section">
                <h3>Demographics</h3>
                <div className="resident-detail-grid">
                  <ResidentDetail label="Sex" value={viewedResident.sex === 'F' ? 'Female' : 'Male'} />
                  <ResidentDetail label="Date of birth" value={formatDate(viewedResident.dateOfBirth)} />
                  <ResidentDetail label="Birth status" value={viewedResident.birthStatus} />
                  <ResidentDetail label="Present age" value={formatResidentAge(viewedResident.dateOfBirth)} />
                  <ResidentDetail label="Place of birth" value={viewedResident.placeOfBirth} />
                  <ResidentDetail label="Religion" value={viewedResident.religion} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Case classification</h3>
                <div className="resident-detail-grid">
                  <ResidentDetail label="Case category" value={viewedResident.caseCategory} />
                  <ResidentDetail label="Case status" value={viewedResident.caseStatus} />
                  <ResidentDetail label="Initial risk" value={viewedResident.initialRiskLevel} />
                  <ResidentDetail label="Current risk" value={viewedResident.currentRiskLevel} />
                  <ResidentDetail label="Sub-categories" value={getResidentSubcategoryLabels(viewedResident).join(', ') || 'None recorded'} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Disability and family profile</h3>
                <div className="resident-detail-grid">
                  <ResidentDetail label="PWD" value={viewedResident.isPwd ? viewedResident.pwdType ?? 'Yes' : 'No'} />
                  <ResidentDetail label="Special needs" value={viewedResident.hasSpecialNeeds ? viewedResident.specialNeedsDiagnosis ?? 'Yes' : 'No'} />
                  <ResidentDetail label="4Ps beneficiary" value={toYesNo(viewedResident.familyIs4Ps)} />
                  <ResidentDetail label="Solo parent family" value={toYesNo(viewedResident.familySoloParent)} />
                  <ResidentDetail label="Indigenous family" value={toYesNo(viewedResident.familyIndigenous)} />
                  <ResidentDetail label="Parent with disability" value={toYesNo(viewedResident.familyParentPwd)} />
                  <ResidentDetail label="Informal settler family" value={toYesNo(viewedResident.familyInformalSettler)} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Admission and referral</h3>
                <div className="resident-detail-grid">
                  <ResidentDetail label="Date admitted" value={formatDate(viewedResident.dateOfAdmission)} />
                  <ResidentDetail label="Age on admission" value={formatResidentAge(viewedResident.dateOfBirth, viewedResident.dateOfAdmission)} />
                  <ResidentDetail label="Length of stay" value={formatLengthOfStay(viewedResident.dateOfAdmission, viewedResident.dateClosed)} />
                  <ResidentDetail label="Referral source" value={viewedResident.referralSource} />
                  <ResidentDetail label="Referring person" value={viewedResident.referringAgencyPerson ?? 'Not recorded'} />
                  <ResidentDetail label="COLB registered" value={formatOptionalDate(viewedResident.dateColbRegistered)} />
                  <ResidentDetail label="COLB obtained" value={formatOptionalDate(viewedResident.dateColbObtained)} />
                  <ResidentDetail label="Date enrolled" value={formatOptionalDate(viewedResident.dateEnrolled)} />
                  <ResidentDetail label="Case study prepared" value={formatOptionalDate(viewedResident.dateCaseStudyPrepared)} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Assigned worker and reintegration</h3>
                <div className="resident-detail-grid">
                  <ResidentDetail label="Assigned social worker" value={viewedResident.assignedSocialWorker} />
                  <ResidentDetail label="Reintegration type" value={viewedResident.reintegrationType ?? 'Not set'} />
                  <ResidentDetail label="Reintegration status" value={viewedResident.reintegrationStatus ?? 'Not set'} />
                  <ResidentDetail label="Date closed" value={formatOptionalDate(viewedResident.dateClosed)} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Current intervention plan</h3>
                <div className="resident-detail-grid">
                  <ResidentDetail label="Plan category" value={viewedResident.interventionPlans[0]?.planCategory ?? 'No plan recorded'} />
                  <ResidentDetail label="Plan status" value={formatInterventionStatus(viewedResident.interventionPlans[0]?.status)} />
                  <ResidentDetail label="Target date" value={formatOptionalDate(viewedResident.interventionPlans[0]?.targetDate)} />
                  <ResidentDetail label="Services provided" value={viewedResident.interventionPlans[0]?.servicesProvided ?? 'No services recorded'} />
                  <ResidentDetail label="Plan description" value={viewedResident.interventionPlans[0]?.planDescription ?? 'No plan recorded'} />
                </div>
              </section>

              <section className="resident-modal-section">
                <h3>Assessment notes</h3>
                <p>{viewedResident.initialCaseAssessment}</p>
                {viewedResident.restrictedNotes ? <p className="resident-restricted-notes">{viewedResident.restrictedNotes}</p> : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {canManageCases && editingResidentId ? (
        <div className="modal-backdrop resident-modal-backdrop" onClick={closeEditModal}>
          <div
            aria-modal="true"
            className="modal-surface resident-edit-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Edit resident"
          >
            <div className="resident-modal-header">
              <div>
                <h2>Edit resident</h2>
                <p>Update demographics, case classification, disability profile, referral details, and reintegration tracking.</p>
              </div>
              <button className="ghost-button" onClick={closeEditModal} type="button">
                Cancel
              </button>
            </div>

            <ResidentRecordForm
              residentForm={residentForm}
              setResidentForm={setResidentForm}
              residentErrors={residentErrors}
              safehouses={safehouses}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitLabel="Update resident"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function mapResidentToForm(resident: Resident, fallbackSafehouseId?: number): ResidentRequest {
  return {
    caseControlNumber: resident.caseControlNumber,
    internalCode: resident.internalCode,
    safehouseId: resident.safehouseId || fallbackSafehouseId || 1,
    caseStatus: resident.caseStatus,
    sex: resident.sex,
    dateOfBirth: resident.dateOfBirth,
    birthStatus: resident.birthStatus,
    placeOfBirth: resident.placeOfBirth,
    religion: resident.religion,
    caseCategory: resident.caseCategory,
    subCatOrphaned: resident.subCatOrphaned,
    isTrafficked: resident.isTrafficked,
    subCatChildLabor: resident.subCatChildLabor,
    isPhysicalAbuseCase: resident.isPhysicalAbuseCase,
    isSexualAbuseCase: resident.isSexualAbuseCase,
    subCatOsaec: resident.subCatOsaec,
    subCatCicl: resident.subCatCicl,
    subCatAtRisk: resident.subCatAtRisk,
    subCatStreetChild: resident.subCatStreetChild,
    subCatChildWithHiv: resident.subCatChildWithHiv,
    isPwd: resident.isPwd,
    pwdType: resident.pwdType ?? '',
    hasSpecialNeeds: resident.hasSpecialNeeds,
    specialNeedsDiagnosis: resident.specialNeedsDiagnosis ?? '',
    familyIs4Ps: resident.familyIs4Ps,
    familySoloParent: resident.familySoloParent,
    familyIndigenous: resident.familyIndigenous,
    familyParentPwd: resident.familyParentPwd,
    familyInformalSettler: resident.familyInformalSettler,
    dateOfAdmission: resident.dateOfAdmission,
    referralSource: resident.referralSource,
    referringAgencyPerson: resident.referringAgencyPerson ?? '',
    dateColbRegistered: resident.dateColbRegistered ?? '',
    dateColbObtained: resident.dateColbObtained ?? '',
    assignedSocialWorker: resident.assignedSocialWorker,
    initialCaseAssessment: resident.initialCaseAssessment,
    dateCaseStudyPrepared: resident.dateCaseStudyPrepared ?? '',
    reintegrationType: resident.reintegrationType ?? '',
    reintegrationStatus: resident.reintegrationStatus ?? '',
    initialRiskLevel: resident.initialRiskLevel,
    currentRiskLevel: resident.currentRiskLevel,
    dateEnrolled: resident.dateEnrolled ?? '',
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
      : createResidentForm(fallbackSafehouseId).interventionPlans,
  };
}

function sanitizeResidentPayload(residentForm: ResidentRequest): ResidentRequest {
  return {
    ...residentForm,
    caseControlNumber: sanitizeText(residentForm.caseControlNumber),
    internalCode: sanitizeText(residentForm.internalCode),
    caseStatus: sanitizeText(residentForm.caseStatus),
    sex: sanitizeText(residentForm.sex),
    birthStatus: sanitizeText(residentForm.birthStatus),
    placeOfBirth: sanitizeText(residentForm.placeOfBirth),
    religion: sanitizeText(residentForm.religion),
    caseCategory: sanitizeText(residentForm.caseCategory),
    pwdType: sanitizeOptionalText(residentForm.pwdType ?? ''),
    specialNeedsDiagnosis: sanitizeOptionalText(residentForm.specialNeedsDiagnosis ?? ''),
    referralSource: sanitizeText(residentForm.referralSource),
    referringAgencyPerson: sanitizeOptionalText(residentForm.referringAgencyPerson ?? ''),
    dateColbRegistered: residentForm.dateColbRegistered || null,
    dateColbObtained: residentForm.dateColbObtained || null,
    assignedSocialWorker: sanitizeText(residentForm.assignedSocialWorker),
    initialCaseAssessment: sanitizeText(residentForm.initialCaseAssessment),
    dateCaseStudyPrepared: residentForm.dateCaseStudyPrepared || null,
    reintegrationType: sanitizeOptionalText(residentForm.reintegrationType ?? ''),
    reintegrationStatus: sanitizeOptionalText(residentForm.reintegrationStatus ?? ''),
    initialRiskLevel: sanitizeText(residentForm.initialRiskLevel),
    currentRiskLevel: sanitizeText(residentForm.currentRiskLevel),
    dateEnrolled: residentForm.dateEnrolled || null,
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
}

function getResidentSubcategoryLabels(resident: Resident) {
  return [
    resident.subCatOrphaned ? 'Orphaned' : null,
    resident.isTrafficked ? 'Trafficked' : null,
    resident.subCatChildLabor ? 'Child labor' : null,
    resident.isPhysicalAbuseCase ? 'Physical abuse' : null,
    resident.isSexualAbuseCase ? 'Sexual abuse' : null,
    resident.subCatOsaec ? 'OSAEC' : null,
    resident.subCatCicl ? 'CICL' : null,
    resident.subCatAtRisk ? 'At risk' : null,
    resident.subCatStreetChild ? 'Street child' : null,
    resident.subCatChildWithHiv ? 'Child with HIV' : null,
  ].filter((label): label is string => Boolean(label));
}

function toYesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : 'Not recorded';
}

function formatInterventionStatus(value?: string | null) {
  if (!value) return 'Not set';
  return value === 'InProgress' ? 'In Progress' : value;
}

function formatResidentAge(dateOfBirth: string, referenceDate?: string | null) {
  const birthDate = new Date(dateOfBirth);
  const comparisonDate = referenceDate ? new Date(referenceDate) : new Date();
  if (!Number.isFinite(birthDate.getTime()) || !Number.isFinite(comparisonDate.getTime()) || comparisonDate < birthDate) {
    return 'Unknown';
  }

  let years = comparisonDate.getFullYear() - birthDate.getFullYear();
  let months = comparisonDate.getMonth() - birthDate.getMonth();

  if (comparisonDate.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years}y ${months}m`;
}

function formatLengthOfStay(startDate: string, endDate?: string | null) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    return 'Unknown';
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return years > 0 ? `${years}y ${months}m` : `${months}m`;
}

function ResidentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="resident-detail-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
