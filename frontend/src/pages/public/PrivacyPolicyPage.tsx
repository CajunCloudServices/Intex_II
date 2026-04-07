export function PrivacyPolicyPage() {
  return (
    <div className="page-shell">
      <section className="section-card prose-card">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Privacy</span>
            <h1>Privacy policy starter</h1>
            <p>Tailored starter content for the INTEX nonprofit context. Legal review still required before production use.</p>
          </div>
        </div>

        <p>
          Tanglaw Project processes supporter, donation, resident-care, and outreach data to operate nonprofit services,
          communicate impact, and manage internal case workflows. This starter application is intended for development and
          educational use and should be customized with your final hosting, subprocessors, retention periods, and legal contacts.
        </p>

        <h2>Data we may store</h2>
        <ul className="simple-list">
          <li>Supporter contact details and giving history.</li>
          <li>Staff and donor account information used for authentication.</li>
          <li>Resident case records, process recordings, and visitation notes.</li>
          <li>Anonymous public impact snapshots and social media metrics.</li>
        </ul>

        <h2>How access is controlled</h2>
        <p>
          Role-based access keeps staff records separate from donor-facing data, and the React app uses a JWT session token
          for local development. Sensitive production deployments should add audit logging, field-level review, and formal
          incident response processes.
        </p>

        <h2>Cookie note</h2>
        <p>
          The current dev build stores a JWT token and cookie-consent preference in browser storage. Before production, replace
          this with your finalized consent categories, retention rules, and secure session handling decisions.
        </p>
      </section>
    </div>
  );
}
