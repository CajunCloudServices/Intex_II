import privacySafeguardingImage from '../../assets/generated/privacy-safeguarding.webp';

export function PrivacyPolicyPage() {
  return (
    <div className="page-shell">
      <section className="section-card prose-card">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Privacy</span>
            <h1>Privacy policy</h1>
            <p>How Tanglaw Project collects, uses, and safeguards supporter, staff, and resident-related information.</p>
          </div>
        </div>

        <figure className="editorial-media editorial-media--wide">
          <img
            className="editorial-image"
            src={privacySafeguardingImage}
            alt="A calm secure records room with organized files, frosted glass, and soft shield-shaped light."
          />
        </figure>

        <p>
          Tanglaw Project processes supporter, donation, resident-care, and outreach data to operate nonprofit services,
          communicate impact, and manage internal case workflows. We collect only the information needed to provide safe services,
          administer donations, and maintain secure internal records.
        </p>

        <h2>Data we may store</h2>
        <ul className="simple-list">
          <li>Supporter contact details and giving history.</li>
          <li>Staff and donor account information used for authentication.</li>
          <li>Resident case records, process recordings, and visitation notes.</li>
          <li>Anonymous public impact snapshots and social media metrics.</li>
        </ul>

        <h2>Why we process this information</h2>
        <p>
          We use this information to administer donations, coordinate safe-house operations, document resident care, report anonymized impact, and keep
          internal systems secure. We do not sell personal information or use it for unrelated advertising activity.
        </p>

        <h2>Retention and review</h2>
        <p>
          Operational records are retained according to organizational, legal, and safeguarding needs. Different record types may be kept for different
          periods depending on the sensitivity of the data and the purpose it serves.
        </p>

        <h2>How access is controlled</h2>
        <p>
          Role-based access keeps staff records separate from donor-facing data. Sensitive resident records are intended for
          authorized staff and administrators only, while public reporting is limited to anonymized and aggregated information.
        </p>

        <h2>Cookies, browser storage, and portal sessions</h2>
        <p>
          The site stores a consent preference in a browser-accessible cookie. If you accept optional settings, Tanglaw Project may also store a
          browser-accessible theme preference cookie so React can remember your display choice. For authenticated users, the current application also stores
          a session token in browser storage to keep the portal signed in. These values support site operation and are not used for third-party ad tracking.
        </p>

        <h2>Public reporting and resident privacy</h2>
        <p>
          Tanglaw Project publishes anonymized impact snapshots to help donors understand how resources are used. These
          summaries are designed to protect the privacy and safety of minors, survivors, staff, and partner organizations.
        </p>

        <h2>Your questions and requests</h2>
        <p>
          Questions about privacy, donor records, or data handling practices can be directed to the organization using the contact information shown in the
          site footer. The organization should review and respond based on applicable law, safeguarding policy, and operational constraints.
        </p>
      </section>
    </div>
  );
}
