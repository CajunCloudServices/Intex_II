import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { SectionCard } from '../../components/ui/Cards';
import { ErrorState, LoadingState } from '../../components/ui/PageState';
import { formatMoney } from '../../lib/format';
import donateSupportImage from '../../assets/generated/donate-support.webp';

export function DonatePage() {
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [amount, setAmount] = useState<string>('50');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState('Every 30 days');
  const [notes, setNotes] = useState('');

  const parsedAmount = useMemo(() => {
    const normalized = amount.replace(/[^0-9.]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }, [amount]);

  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Awaited<ReturnType<typeof api.donorImpactPrediction>> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const runPrediction = async (nextAmount: number) => {
    setPredictionError(null);
    setPrediction(null);

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setPredictionError('Enter a valid donation amount greater than $0.');
      return;
    }

    try {
      setPredicting(true);
      setPrediction(await api.donorImpactPrediction(nextAmount));
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : 'Failed to predict donation impact.');
    } finally {
      setPredicting(false);
    }
  };

  const submitDonation = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!donorName.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }
    if (!donorEmail.trim()) {
      setSubmitError('Please enter your email.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError('Please enter a valid donation amount.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.submitPublicDonation({
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        amount: parsedAmount,
        isRecurring,
        recurringInterval: isRecurring ? recurringInterval : null,
        notes: notes.trim() || null,
      });
      setSubmitSuccess(`${response.message} Receipt #${response.donationId}. Thank you for supporting Tanglaw Project.`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit donation right now.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    // Only run once the user has typed something parseable.
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPrediction(null);
      setPredictionError(null);
      setPredicting(false);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      void runPrediction(parsedAmount);
    }, 400);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [parsedAmount]);

  return (
    <div className="page-shell narrow donate-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Support our work</span>
          <h1>Donate</h1>
          <p>
            Online giving is handled through the organization&apos;s secure giving process. This page can be connected
            to a hosted donation form, payment processor, or donor portal as the team finalizes operations.
          </p>
        </div>
      </div>

      <section className="editorial-media editorial-media--wide">
        <img
          className="editorial-image"
          src={donateSupportImage}
          alt="A warm welcome kit inside a safe residence, with blankets, toiletries, a journal, tea, and bedside light."
        />
      </section>

      <SectionCard title="How your gift helps" subtitle="Every contribution supports safe housing and healing">
        <ul className="simple-list donate-list">
          <li>Safe nights in a supervised residence</li>
          <li>Counseling and therapeutic support</li>
          <li>Education, life skills, and transition planning</li>
        </ul>
        <p className="home-muted">
          For now, you can explore our{' '}
          <Link to="/impact">public impact dashboard</Link> or return to the{' '}
          <Link to="/">home page</Link>.
        </p>
      </SectionCard>

      <SectionCard
        title="Donation impact predictor"
        subtitle="Preview how a gift could translate into program outcomes (powered by the ML pipeline workbook)"
      >
        <div className="donate-form-grid">
          <div className="donate-form-field">
            <label className="donate-form-label" htmlFor="donor-name">
              Donor name
            </label>
            <input
              id="donor-name"
              className="donate-form-input"
              placeholder="e.g., Jane Doe"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>
          <div className="donate-form-field">
            <label className="donate-form-label" htmlFor="donor-email">
              Email
            </label>
            <input
              id="donor-email"
              className="donate-form-input"
              placeholder="e.g., jane@example.org"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="donate-form-grid">
          <div className="donate-form-field">
            <label className="donate-form-label" htmlFor="donation-amount">
              Amount (USD)
            </label>
            <input
              id="donation-amount"
              inputMode="decimal"
              className="donate-form-input"
              placeholder="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="donate-form-field donate-form-actions">
            <label className="donate-form-check">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              Recurring gift
            </label>
          </div>
        </div>

        {isRecurring ? (
          <div className="donate-form-grid">
            <div className="donate-form-field">
              <label className="donate-form-label" htmlFor="recurring-interval">
                Donation frequency
              </label>
              <select
                id="recurring-interval"
                className="donate-form-input"
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(e.target.value)}
              >
                <option>Every 30 days</option>
                <option>Every 90 days</option>
                <option>Every year</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="donate-form-grid">
          <div className="donate-form-field">
            <label className="donate-form-label" htmlFor="donation-notes">
              Notes (optional)
            </label>
            <input
              id="donation-notes"
              className="donate-form-input"
              placeholder="Add a note for staff (not submitted yet)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {predicting ? <LoadingState label="Predicting impact..." /> : null}
        {predictionError ? <ErrorState message={predictionError} onRetry={() => void runPrediction(parsedAmount)} /> : null}

        {prediction ? (
          <div className="section-card" style={{ marginTop: '1rem' }}>
            <h3>Estimated outcomes for {formatMoney(prediction.amount)}</h3>
            <p className="donate-impact-highlight">
              This {formatMoney(prediction.amount)} donation is predicted to impact the lives of{' '}
              <strong>{prediction.estimatedVictimsImpacted.toFixed(2)}</strong> victims.
            </p>
            <p className="home-muted" style={{ marginTop: 0 }}>
              {prediction.assumptions}
            </p>
            <div className="data-table-wrap donate-impact-table-wrap">
              <table className="data-table donate-impact-table">
                <caption>Impact prediction</caption>
                <thead>
                  <tr>
                    <th scope="col">Program area</th>
                    <th scope="col">Allocated</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Unit cost</th>
                    <th scope="col">Estimated units</th>
                  </tr>
                </thead>
                <tbody>
                  {prediction.outcomes.map((row) => (
                    <tr key={row.programArea}>
                      <td>{row.programArea}</td>
                      <td>{formatMoney(row.allocatedAmount)}</td>
                      <td>{row.outcomeUnit}</td>
                      <td>{formatMoney(row.unitCost)}</td>
                      <td>{row.estimatedUnits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted-inline" style={{ marginTop: '0.75rem' }}>
              Donor: <strong>{donorName || 'Anonymous'}</strong>
              {donorEmail ? ` · ${donorEmail}` : ''} {isRecurring ? '· Recurring' : null}
              {isRecurring ? ` · ${recurringInterval}` : ''}
            </p>
          </div>
        ) : null}

        <div className="donate-submit-row">
          <button
            className="primary-button"
            type="button"
            onClick={() => void submitDonation()}
            disabled={submitting}
          >
            {submitting ? 'Submitting donation…' : 'Submit donation'}
          </button>
        </div>
        {submitError ? <ErrorState message={submitError} onRetry={() => void submitDonation()} /> : null}
        {submitSuccess ? <p className="donate-success">{submitSuccess}</p> : null}
      </SectionCard>
    </div>
  );
}
