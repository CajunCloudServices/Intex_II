import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { DonationRequest, Safehouse, Supporter } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeOptionalText, sanitizeText } from '../../lib/validation';
import { createDonationForm } from './forms/donorFormDefaults';
import { validateDonationForm } from './forms/donorsFormValidation';
import { DonationRecordForm } from './forms/DonationRecordForm';
import type { ValidationErrors } from '../../lib/validation';

export function DonorDonationNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [donationForm, setDonationForm] = useState<DonationRequest>(createDonationForm());
  const [donationErrors, setDonationErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [supportersData, safehouseData] = await Promise.all([api.supporters(), api.safehouses()]);
        if (cancelled) return;
        setSupporters(supportersData);
        setSafehouses(safehouseData);
        setDonationForm((current) => (current.allocations[0].safehouseId > 0 ? current : createDonationForm(safehouseData[0]?.id)));
      } catch (err) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load donation form data.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const supporterOptions = useMemo(
    () => supporters.map((supporter) => ({ value: supporter.id, label: `${supporter.displayName} (${supporter.email})` })),
    [supporters],
  );

  if (!user) return null;

  const handleDonationSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);
    const formErrors = validateDonationForm(donationForm);
    setDonationErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(false);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted donation fields.' });
      return;
    }

    try {
      const payload = {
        ...donationForm,
        donationType: sanitizeText(donationForm.donationType),
        channelSource: sanitizeText(donationForm.channelSource),
        currencyCode: sanitizeOptionalText(donationForm.currencyCode ?? ''),
        impactUnit: sanitizeText(donationForm.impactUnit),
        campaignName: sanitizeOptionalText(donationForm.campaignName ?? ''),
        notes: sanitizeOptionalText(donationForm.notes ?? ''),
        allocations: donationForm.allocations.map((allocation) => ({
          ...allocation,
          programArea: sanitizeText(allocation.programArea),
          allocationNotes: sanitizeOptionalText(allocation.allocationNotes ?? ''),
        })),
      };

      await api.createDonation(payload);
      navigate('/portal/donors');
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Donation save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Fundraising operations</span>
          <h1>Add donation</h1>
          <p>Record a contribution with its primary safehouse allocation.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/donors">
            Back to list
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading supporters and safehouses..." />
      ) : (
        <SectionCard title="Create donation" subtitle="Capture the full contribution while keeping the primary safehouse allocation visible for review.">
          <DonationRecordForm
            donationForm={donationForm}
            setDonationForm={setDonationForm}
            donationErrors={donationErrors}
            supporterOptions={supporterOptions}
            safehouses={safehouses}
            onSubmit={handleDonationSubmit}
            submitting={submitting}
            submitLabel="Create donation"
          />
        </SectionCard>
      )}
    </div>
  );
}
