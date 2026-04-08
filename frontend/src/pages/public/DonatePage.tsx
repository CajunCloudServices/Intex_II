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
  const [campaignName, setCampaignName] = useState('');
  const [notes, setNotes] = useState('');

  const parsedAmount = useMemo(() => {
    const normalized = amount.replace(/[^0-9.]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }, [amount]);

  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Awaited<ReturnType<typeof api.donorImpactPrediction>> | null>(null);
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
        <div className="form-grid-two" style={{ marginTop: '0.75rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="donor-name">
              Donor name
            </label>
            <input
              id="donor-name"
              className="inline-search"
              placeholder="e.g., Jane Doe"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="donor-email">
              Email
            </label>
            <input
              id="donor-email"
              className="inline-search"
              placeholder="e.g., jane@example.org"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-two" style={{ marginTop: '0.75rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="donation-amount">
              Amount (USD)
            </label>
            <input
              id="donation-amount"
              inputMode="decimal"
              className="inline-search"
              placeholder="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              Recurring gift
            </label>
            <button
              className="ghost-button"
              type="button"
              onClick={() => void runPrediction(parsedAmount)}
              disabled={predicting || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
            >
              Refresh impact
            </button>
          </div>
        </div>

        <div className="form-grid-two" style={{ marginTop: '0.75rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="campaign-name">
              Campaign (optional)
            </label>
            <input
              id="campaign-name"
              className="inline-search"
              placeholder="e.g., Spring shelter fund"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="donation-notes">
              Notes (optional)
            </label>
            <input
              id="donation-notes"
              className="inline-search"
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
            <p className="home-muted" style={{ marginTop: 0 }}>
              {prediction.assumptions}
            </p>
            <div className="data-table-wrap">
              <table className="data-table">
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
              {campaignName ? ` · Campaign: ${campaignName}` : ''}
            </p>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
