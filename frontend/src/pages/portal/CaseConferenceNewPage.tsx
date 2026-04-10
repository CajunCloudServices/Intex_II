import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { CaseConference, CaseConferenceRequest, HomeVisitation, Resident } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { compactFieldErrors, extractApiFieldErrors } from '../../lib/apiErrors';
import { buildWorkerOptions, createConferenceForm } from './forms/homeVisitationDefaults';
import { CaseConferenceRecordForm, type CaseConferenceFieldErrors } from './forms/CaseConferenceRecordForm';

export function CaseConferenceNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [conferences, setConferences] = useState<CaseConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [conferenceForm, setConferenceForm] = useState<CaseConferenceRequest>(createConferenceForm());
  const [fieldErrors, setFieldErrors] = useState<CaseConferenceFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [residentData, visitationData, conferenceData] = await Promise.all([
          api.residents(),
          api.homeVisitations(),
          api.caseConferences(),
        ]);
        if (cancelled) return;
        setResidents(residentData);
        setVisitations(visitationData);
        setConferences(conferenceData);
        setConferenceForm((current) => (current.residentId > 0 ? current : createConferenceForm(residentData[0]?.id)));
      } catch (err) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load residents.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const residentOptions = useMemo(() => residents.map((resident) => ({ value: resident.id, label: resident.caseControlNumber })), [residents]);
  const workerOptions = useMemo(() => buildWorkerOptions(residents, visitations, conferences), [conferences, residents, visitations]);

  if (!user) return null;

  const handleConferenceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const nextFieldErrors = validateCaseConferenceForm(conferenceForm);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFeedback(null);
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    setFieldErrors({});

    try {
      const payload = {
        ...conferenceForm,
        nextReviewDate: conferenceForm.nextReviewDate || null,
      };
      await api.createCaseConference(payload);
      navigate('/portal/home-visitations');
    } catch (err) {
      const apiFieldErrors = extractCaseConferenceFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      } else {
        setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Case conference save failed.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Field work</span>
          <h1>New case conference</h1>
          <p>Record attendee decisions, next review dates, and required follow-up actions.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/home-visitations">
            Back to list
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading residents..." />
      ) : (
        <SectionCard title="Create case conference" subtitle="Record attendee decisions, next review dates, and required follow-up actions.">
          <CaseConferenceRecordForm
            conferenceForm={conferenceForm}
            setConferenceForm={setConferenceForm}
            residentOptions={residentOptions}
            workerOptions={workerOptions}
            fieldErrors={fieldErrors}
            onSubmit={handleConferenceSubmit}
            submitting={submitting}
            submitLabel="Create case conference"
          />
        </SectionCard>
      )}
    </div>
  );
}

function validateCaseConferenceForm(form: CaseConferenceRequest): CaseConferenceFieldErrors {
  const errors: CaseConferenceFieldErrors = {};
  if (form.residentId <= 0) errors.residentId = 'Select a resident.';
  if (!form.conferenceDate) errors.conferenceDate = 'Enter the conference date.';
  if (!form.leadWorker.trim()) errors.leadWorker = 'Select the lead worker.';
  if (!form.status.trim()) errors.status = 'Select the conference status.';
  if (!form.purpose.trim()) errors.purpose = 'Enter the conference purpose.';
  if (form.status !== 'Scheduled' && !form.decisionsMade.trim()) errors.decisionsMade = 'Enter the conference decisions.';
  if (form.status !== 'Scheduled' && !form.followUpActions.trim()) errors.followUpActions = 'Enter the follow-up actions.';
  return errors;
}

function extractCaseConferenceFieldErrors(error: unknown): CaseConferenceFieldErrors {
  const apiErrors = extractApiFieldErrors(error);
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
