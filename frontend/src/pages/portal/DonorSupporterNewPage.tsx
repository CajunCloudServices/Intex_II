import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { SupporterRequest } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeOptionalText, sanitizeText, type ValidationErrors } from '../../lib/validation';
import { defaultSupporterForm } from './forms/donorFormDefaults';
import { validateSupporterForm } from './forms/donorsFormValidation';
import { SupporterRecordForm } from './forms/SupporterRecordForm';

export function DonorSupporterNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supporterForm, setSupporterForm] = useState<SupporterRequest>(defaultSupporterForm);
  const [supporterErrors, setSupporterErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  if (!user) return null;

  const handleSupporterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);
    const formErrors = validateSupporterForm(supporterForm);
    setSupporterErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(false);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted supporter fields.' });
      return;
    }

    try {
      const payload = {
        ...supporterForm,
        displayName: sanitizeText(supporterForm.displayName),
        email: sanitizeText(supporterForm.email),
        supporterType: sanitizeText(supporterForm.supporterType),
        status: sanitizeText(supporterForm.status),
        relationshipType: sanitizeText(supporterForm.relationshipType),
        region: sanitizeText(supporterForm.region),
        country: sanitizeText(supporterForm.country),
        acquisitionChannel: sanitizeText(supporterForm.acquisitionChannel),
        organizationName: sanitizeOptionalText(supporterForm.organizationName ?? ''),
        firstName: sanitizeOptionalText(supporterForm.firstName ?? ''),
        lastName: sanitizeOptionalText(supporterForm.lastName ?? ''),
        phone: sanitizeOptionalText(supporterForm.phone ?? ''),
        firstDonationDate: supporterForm.firstDonationDate || null,
      };

      await api.createSupporter(payload);
      navigate('/portal/donors');
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Supporter save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Fundraising operations</span>
          <h1>New supporter</h1>
          <p>Add a supporter record that matches the current donor workflow.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/donors">
            Back to list
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <SectionCard title="Create supporter" subtitle="Maintain supporter records with a straightforward operational form that matches the current donor workflow.">
        <SupporterRecordForm
          supporterForm={supporterForm}
          setSupporterForm={setSupporterForm}
          supporterErrors={supporterErrors}
          onSubmit={handleSupporterSubmit}
          submitting={submitting}
          submitLabel="Create supporter"
        />
      </SectionCard>
    </div>
  );
}
