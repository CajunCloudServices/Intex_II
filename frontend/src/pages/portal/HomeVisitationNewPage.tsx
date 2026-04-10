import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { HomeVisitation, HomeVisitationRequest, Resident } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { buildVisitLocationOptions, buildWorkerOptions, createVisitationForm } from './forms/homeVisitationDefaults';
import { HomeVisitationRecordForm, type HomeVisitationFieldErrors } from './forms/HomeVisitationRecordForm';

export function HomeVisitationNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitationForm, setVisitationForm] = useState<HomeVisitationRequest>(createVisitationForm());
  const [fieldErrors, setFieldErrors] = useState<HomeVisitationFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [residentData, visitationData] = await Promise.all([
          api.residents(),
          api.homeVisitations(),
        ]);
        if (cancelled) return;
        setResidents(residentData);
        setVisitations(visitationData);
        setVisitationForm((current) => (current.residentId > 0 ? current : createVisitationForm(residentData[0]?.id)));
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
  const workerOptions = useMemo(() => buildWorkerOptions(residents, visitations), [residents, visitations]);
  const locationOptions = useMemo(() => buildVisitLocationOptions(residents, visitations), [residents, visitations]);

  if (!user) return null;

  const handleVisitSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const nextFieldErrors = validateHomeVisitationForm(visitationForm);
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
        ...visitationForm,
        followUpNotes: visitationForm.followUpNotes || null,
      };
      await api.createHomeVisitation(payload);
      navigate('/portal/home-visitations');
    } catch (err) {
      const apiFieldErrors = extractHomeVisitationFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      } else {
        setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Home visitation save failed.' });
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
          <h1>Log home visit</h1>
          <p>Capture visit type, observations, safety concerns, and follow-up actions.</p>
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
        <SectionCard title="Create home visitation" subtitle="Capture visit type, observations, safety concerns, and follow-up actions.">
          <HomeVisitationRecordForm
            visitationForm={visitationForm}
            setVisitationForm={setVisitationForm}
            residentOptions={residentOptions}
            workerOptions={workerOptions}
            locationOptions={locationOptions}
            fieldErrors={fieldErrors}
            onSubmit={handleVisitSubmit}
            submitting={submitting}
            submitLabel="Create home visitation"
          />
        </SectionCard>
      )}
    </div>
  );
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
  if (form.safetyConcernsNoted && !form.safetyConcernDetails.trim()) errors.safetyConcernDetails = 'Describe the safety concern.';
  if (form.followUpNeeded && !form.followUpNotes?.trim()) errors.followUpNotes = 'Enter the follow-up action.';
  return errors;
}

function extractHomeVisitationFieldErrors(error: unknown): HomeVisitationFieldErrors {
  if (!(error instanceof ApiError) || !error.details) return {};
  try {
    const parsed = JSON.parse(error.details) as { errors?: Record<string, string[]> };
    const apiErrors = parsed.errors ?? {};
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
  } catch {
    return {};
  }
}

function compactFieldErrors<T extends Record<string, string | undefined>>(errors: T): T {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value)),
  ) as T;
}
