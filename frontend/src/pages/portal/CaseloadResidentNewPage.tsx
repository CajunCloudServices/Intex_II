import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { Resident, ResidentRequest, Safehouse } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeOptionalText, sanitizeText } from '../../lib/validation';
import { buildWorkerOptions } from './forms/homeVisitationDefaults';
import { createResidentForm, generateNextCaseControlNumber, generateNextInternalCode } from './forms/residentFormDefaults';
import { extractResidentFieldErrors, validateResidentForm } from './forms/residentFormValidation';
import { ResidentRecordForm } from './forms/ResidentRecordForm';
import type { ValidationErrors } from '../../lib/validation';

export function CaseloadResidentNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [residentForm, setResidentForm] = useState<ResidentRequest>(createResidentForm());
  const [residentErrors, setResidentErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const socialWorkerOptions = useMemo(() => buildWorkerOptions(residents), [residents]);
  const nextCaseControlNumber = useMemo(() => generateNextCaseControlNumber(residents), [residents]);
  const nextInternalCode = useMemo(
    () => generateNextInternalCode(residents, residentForm.dateOfAdmission),
    [residents, residentForm.dateOfAdmission],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [safehouseData, residentData] = await Promise.all([
          api.safehouses(),
          api.residents(),
        ]);
        if (cancelled) return;
        setSafehouses(safehouseData);
        setResidents(residentData);
        setResidentForm((current) => {
          const seeded = current.safehouseId > 0 ? current : createResidentForm(safehouseData[0]?.id);
          return {
            ...seeded,
            caseControlNumber: generateNextCaseControlNumber(residentData),
            internalCode: generateNextInternalCode(residentData, seeded.dateOfAdmission),
          };
        });
      } catch (err) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load resident intake options.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setResidentForm((current) => {
      if (current.caseControlNumber === nextCaseControlNumber && current.internalCode === nextInternalCode) {
        return current;
      }

      return {
        ...current,
        caseControlNumber: nextCaseControlNumber,
        internalCode: nextInternalCode,
      };
    });
  }, [nextCaseControlNumber, nextInternalCode]);

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);
    const formErrors = validateResidentForm(residentForm);
    setResidentErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(false);
      const errorMessages = Object.values(formErrors).filter(Boolean) as string[];
      setFeedback({
        tone: 'error',
        message: `Please fix the following before saving:\n• ${errorMessages.join('\n• ')}`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const payload = {
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
        referralSource: sanitizeText(residentForm.referralSource),
        assignedSocialWorker: sanitizeText(residentForm.assignedSocialWorker),
        initialCaseAssessment: sanitizeText(residentForm.initialCaseAssessment),
        initialRiskLevel: sanitizeText(residentForm.initialRiskLevel),
        currentRiskLevel: sanitizeText(residentForm.currentRiskLevel),
        specialNeedsDiagnosis: sanitizeOptionalText(residentForm.specialNeedsDiagnosis ?? ''),
        referringAgencyPerson: sanitizeOptionalText(residentForm.referringAgencyPerson ?? ''),
        dateColbRegistered: residentForm.dateColbRegistered || null,
        dateColbObtained: residentForm.dateColbObtained || null,
        dateCaseStudyPrepared: residentForm.dateCaseStudyPrepared || null,
        reintegrationType: sanitizeOptionalText(residentForm.reintegrationType ?? ''),
        reintegrationStatus: sanitizeOptionalText(residentForm.reintegrationStatus ?? ''),
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

      await api.createResident(payload);
      navigate('/portal/caseload');
    } catch (err) {
      const apiFieldErrors = extractResidentFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setResidentErrors(apiFieldErrors);
      } else {
        setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Resident save failed.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell caseload-page">
      <div className="caseload-header">
        <div>
          <div className="caseload-breadcrumb">Archive / Current Quarter</div>
          <h1>New case</h1>
          <p>Intake a resident record with risk signals and a starter intervention plan.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/caseload">
            Back to archive
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading safehouses..." />
      ) : (
        <SectionCard title="Create resident" subtitle="Keep the current intervention direction visible while maintaining a focused resident intake workflow.">
          <ResidentRecordForm
            residentForm={residentForm}
            setResidentForm={setResidentForm}
            residentErrors={residentErrors}
            safehouses={safehouses}
            socialWorkerOptions={socialWorkerOptions}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="Create resident"
            caseControlNumberReadOnly
            internalCodeReadOnly
          />
        </SectionCard>
      )}
    </div>
  );
}
