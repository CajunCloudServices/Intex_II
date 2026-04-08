import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState, LoadingState } from '../../components/ui/PageState';
import { formatMoney } from '../../lib/format';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

const IMPACT_GUIDE = [
  { amount: 25, copy: 'Provides a week of meals and essentials for one resident.' },
  { amount: 50, copy: 'Covers school supplies and daily learning materials.' },
  { amount: 100, copy: 'Funds one counseling session and follow-up support.' },
  { amount: 250, copy: 'Supports a month of childcare, transport, and case coordination.' },
  { amount: 500, copy: 'Helps cover emergency medical and wellbeing needs.' },
  { amount: 1000, copy: 'Sustains one resident’s care plan across a full month.' },
];

type DonationMode = 'anonymous' | 'account';

export function DonatePage() {
  const navigate = useNavigate();
  const { registerDonor } = useAuth();
  const [donationMode, setDonationMode] = useState<DonationMode>('anonymous');
  const [amount, setAmount] = useState<string>('100');
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Awaited<ReturnType<typeof api.donorImpactPrediction>> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const parsedAmount = useMemo(() => {
    const normalized = amount.replace(/[^0-9.]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }, [amount]);

  const activeGuide = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return IMPACT_GUIDE[2];
    }

    return (
      IMPACT_GUIDE.find((entry, index) => {
        const next = IMPACT_GUIDE[index + 1];
        return parsedAmount >= entry.amount && (!next || parsedAmount < next.amount);
      }) ?? IMPACT_GUIDE[IMPACT_GUIDE.length - 1]
    );
  }, [parsedAmount]);

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

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError('Please enter a valid donation amount.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.submitPublicDonation({
        isAnonymous: true,
        donorName: null,
        donorEmail: null,
        amount: parsedAmount,
        isRecurring,
        recurringInterval: isRecurring ? 'Monthly' : null,
        notes: notes.trim() || null,
      });

      setSubmitSuccess(`${response.message} Receipt #${response.donationId}. Thank you for supporting Tanglaw Project.`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit donation right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegistration = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!fullName.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setSubmitError('Please enter your email.');
      return;
    }

    if (!password) {
      setSubmitError('Please create a password.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Password and confirm password must match.');
      return;
    }

    if (!region.trim()) {
      setSubmitError('Please enter your region.');
      return;
    }

    if (!country.trim()) {
      setSubmitError('Please enter your country.');
      return;
    }

    try {
      setSubmitting(true);
      await registerDonor({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        region: region.trim(),
        country: country.trim(),
        phone: phone.trim() || null,
      });
      navigate('/portal/my-impact', { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create donor account right now.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPrediction(null);
      setPredictionError(null);
      setPredicting(false);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      void runPrediction(parsedAmount);
    }, 350);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [parsedAmount]);

  return (
    <div className="page-shell donate-page">
      <section className="donate-hero">
        <span className="eyebrow">Support Tanglaw Project</span>
        <h1>Make a difference today</h1>
        <p>Your support helps survivors rebuild their lives with dignity, stability, and hope.</p>
      </section>

      <section className="donate-layout" aria-label="Donate experience">
        <div className="donate-main-card">
          <div className="donate-card-header">
            <div>
              <h2>Choose how to give</h2>
              <p>Record a real demo donation to the database without processing a live payment.</p>
            </div>
            <span className="donate-demo-chip">Demo checkout</span>
          </div>

          <div className="donate-mode-toggle" role="tablist" aria-label="Donation path">
            <button
              type="button"
              className={`donate-choice-pill${donationMode === 'anonymous' ? ' is-active' : ''}`}
              onClick={() => setDonationMode('anonymous')}
            >
              Anonymous donation
            </button>
            <button
              type="button"
              className={`donate-choice-pill${donationMode === 'account' ? ' is-active' : ''}`}
              onClick={() => setDonationMode('account')}
            >
              Create donor account
            </button>
          </div>

          {donationMode === 'anonymous' ? (
            <>
              <div className="donate-frequency-row">
                <span className="donate-section-label">Donation frequency</span>
                <div className="donate-frequency-toggle" role="group" aria-label="Donation frequency">
                  <button
                    type="button"
                    className={`donate-choice-pill donate-choice-pill-small${!isRecurring ? ' is-active' : ''}`}
                    onClick={() => setIsRecurring(false)}
                  >
                    One-time
                  </button>
                  <button
                    type="button"
                    className={`donate-choice-pill donate-choice-pill-small${isRecurring ? ' is-active' : ''}`}
                    onClick={() => setIsRecurring(true)}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="donate-amount-block">
                <span className="donate-section-label">Select amount</span>
                <div className="donate-amount-grid">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`donate-amount-button${parsedAmount === preset ? ' is-active' : ''}`}
                      onClick={() => setAmount(String(preset))}
                    >
                      {formatMoney(preset)}
                    </button>
                  ))}
                </div>
                <label className="donate-form-label" htmlFor="donation-amount">
                  Or enter a custom amount
                </label>
                <div className="donate-amount-input-wrap">
                  <span>$</span>
                  <input
                    id="donation-amount"
                    inputMode="decimal"
                    className="donate-form-input donate-amount-input"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : null}

          {donationMode === 'anonymous' ? (
            <div className="donate-anonymous-note">
              <strong>Anonymous donations keep your identity off the public donor path.</strong>
              <span>Your gift is still recorded in the database for the demo, but it will not ask for your name or email.</span>
            </div>
          ) : (
            <div className="donate-tracked-block">
              <p className="donate-tracked-note">
                Create a donor account to sign in, donate through your dashboard, and track your giving history over time.
              </p>
              <div className="donate-form-grid">
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-full-name">
                    Full name
                  </label>
                  <input
                    id="donor-full-name"
                    className="donate-form-input"
                    placeholder="e.g., Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-account-email">
                    Email
                  </label>
                  <input
                    id="donor-account-email"
                    className="donate-form-input"
                    placeholder="e.g., jane@example.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-password">
                    Password
                  </label>
                  <input
                    id="donor-password"
                    type="password"
                    className="donate-form-input"
                    placeholder="Minimum 14 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="donor-confirm-password"
                    type="password"
                    className="donate-form-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-region">
                    Region
                  </label>
                  <input
                    id="donor-region"
                    className="donate-form-input"
                    placeholder="e.g., Mountain West"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-country">
                    Country
                  </label>
                  <input
                    id="donor-country"
                    className="donate-form-input"
                    placeholder="e.g., United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="donate-form-field">
                  <label className="donate-form-label" htmlFor="donor-phone">
                    Phone (optional)
                  </label>
                  <input
                    id="donor-phone"
                    className="donate-form-input"
                    placeholder="Optional phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <p className="donate-submit-note">
                Already have an account? <Link to="/login" state={{ from: '/portal/my-impact' }}>Sign in</Link> to view your donor dashboard.
              </p>
            </div>
          )}

          <div className="donate-form-field">
            <label className="donate-form-label" htmlFor="donation-notes">
              Notes (optional)
            </label>
            <textarea
              id="donation-notes"
              className="donate-form-input donate-form-textarea"
              placeholder="Add a dedication, internal demo note, or context for your gift."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="donate-submit-row">
            <button
              className="primary-button donate-submit-button"
              type="button"
              onClick={() => void (donationMode === 'anonymous' ? submitDonation() : submitRegistration())}
              disabled={submitting}
            >
              {submitting
                ? donationMode === 'anonymous'
                  ? 'Recording donation…'
                  : 'Creating account…'
                : donationMode === 'anonymous'
                  ? 'Give anonymously'
                  : 'Create donor account'}
            </button>
            <p className="donate-submit-note">
              {donationMode === 'anonymous'
                ? 'No card processing happens here. This is a polished demo flow backed by your donation database.'
                : 'Your donor account will link to a supporter record and open the authenticated donor dashboard.'}
            </p>
          </div>

          {submitError ? (
            <ErrorState
              message={submitError}
              onRetry={() => void (donationMode === 'anonymous' ? submitDonation() : submitRegistration())}
            />
          ) : null}
          {submitSuccess ? <p className="donate-success">{submitSuccess}</p> : null}

          <details className="donate-prediction-details" open={Boolean(prediction) && donationMode === 'anonymous'}>
            <summary>See detailed impact breakdown</summary>
            {predicting ? <LoadingState label="Predicting impact..." /> : null}
            {predictionError ? <ErrorState message={predictionError} onRetry={() => void runPrediction(parsedAmount)} /> : null}
            {prediction ? (
              <div className="donate-prediction-panel">
                <p className="donate-impact-highlight">
                  A {formatMoney(prediction.amount)} gift is predicted to impact the lives of{' '}
                  <strong>{prediction.estimatedVictimsImpacted.toFixed(2)}</strong> survivors.
                </p>
                <p className="home-muted">{prediction.assumptions}</p>
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
              </div>
            ) : null}
          </details>
        </div>

        <aside className="donate-side-rail">
          <div className="donate-side-card">
            <div className="donate-side-card-header">
              <span className="donate-side-icon">+</span>
              <h3>{donationMode === 'anonymous' ? 'Your impact' : 'Why create an account'}</h3>
            </div>
            {donationMode === 'anonymous' ? (
              <>
                <p className="donate-impact-amount">{formatMoney(Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : activeGuide.amount)}</p>
                <p className="donate-impact-copy">{activeGuide.copy}</p>
              </>
            ) : (
              <>
                <p className="donate-impact-copy">
                  Donor accounts unlock the authenticated dashboard so supporters can review giving history, allocations, and long-term impact in one place.
                </p>
                <ul className="donate-impact-list">
                  <li>
                    <strong>Private donor dashboard</strong>
                    <span>Review your full giving history after you sign in.</span>
                  </li>
                  <li>
                    <strong>Connected supporter record</strong>
                    <span>Your account links directly to the donor data already used by the portal.</span>
                  </li>
                  <li>
                    <strong>Future donations stay tracked</strong>
                    <span>Use your donor dashboard for repeat gifts and impact visibility.</span>
                  </li>
                </ul>
              </>
            )}

            {donationMode === 'anonymous' && prediction ? (
              <ul className="donate-impact-list">
                {prediction.outcomes.slice(0, 4).map((outcome) => (
                  <li key={outcome.programArea}>
                    <strong>{outcome.programArea}</strong>
                    <span>
                      {formatMoney(outcome.allocatedAmount)} toward {outcome.estimatedUnits} {outcome.outcomeUnit.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : donationMode === 'anonymous' ? (
              <ul className="donate-impact-guide">
                {IMPACT_GUIDE.map((entry) => (
                  <li key={entry.amount}>
                    <button type="button" onClick={() => setAmount(String(entry.amount))}>
                      <strong>{formatMoney(entry.amount)}</strong>
                      <span>{entry.copy}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="donate-side-card donate-side-card-soft">
            <div className="donate-side-card-header">
              <span className="donate-side-icon">i</span>
              <h3>Other ways to help</h3>
            </div>
            <ul className="donate-support-links">
              <li>
                <strong>See the impact</strong>
                <Link to="/impact">Explore the public impact dashboard</Link>
              </li>
              <li>
                <strong>Track your giving</strong>
                <Link to="/login" state={{ from: '/portal/my-impact' }}>Log in to use the donor dashboard</Link>
              </li>
              <li>
                <strong>Share Tanglaw’s mission</strong>
                <Link to="/">Return home and share the project story</Link>
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
