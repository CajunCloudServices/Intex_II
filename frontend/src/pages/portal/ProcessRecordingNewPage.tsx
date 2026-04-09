import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { ProcessRecordingRequest, Resident } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { createRecordingForm } from './forms/processRecordingDefaults';
import { ProcessRecordingForm } from './forms/ProcessRecordingForm';

export function ProcessRecordingNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingForm, setRecordingForm] = useState<ProcessRecordingRequest>(createRecordingForm());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const residentData = await api.residents();
        if (cancelled) return;
        setResidents(residentData);
        setRecordingForm((current) => (current.residentId > 0 ? current : createRecordingForm(residentData[0]?.id)));
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

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        ...recordingForm,
        restrictedNotes: isAdmin ? recordingForm.restrictedNotes || null : null,
      };
      await api.createProcessRecording(payload);
      navigate('/portal/process-recordings');
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Process recording save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Clinical notes</span>
          <h1>New process recording</h1>
          <p>Document a counseling session chronologically so staff can follow each resident&apos;s healing journey over time.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/process-recordings">
            Back to list
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading residents..." />
      ) : (
        <SectionCard title="Create process recording" subtitle="Capture the full counseling narrative with enough structure to review progress over time.">
          <ProcessRecordingForm
            recordingForm={recordingForm}
            setRecordingForm={setRecordingForm}
            residents={residents}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="Create process recording"
            showRestrictedNotes={isAdmin}
          />
        </SectionCard>
      )}
    </div>
  );
}
