import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { CaseConferenceRequest, Resident } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { createConferenceForm } from './forms/homeVisitationDefaults';
import { CaseConferenceRecordForm } from './forms/CaseConferenceRecordForm';

export function CaseConferenceNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [conferenceForm, setConferenceForm] = useState<CaseConferenceRequest>(createConferenceForm());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const residentData = await api.residents();
        if (cancelled) return;
        setResidents(residentData);
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

  if (!user) return null;

  const handleConferenceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        ...conferenceForm,
        nextReviewDate: conferenceForm.nextReviewDate || null,
      };
      await api.createCaseConference(payload);
      navigate('/portal/home-visitations');
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Case conference save failed.' });
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
            onSubmit={handleConferenceSubmit}
            submitting={submitting}
            submitLabel="Create case conference"
          />
        </SectionCard>
      )}
    </div>
  );
}
