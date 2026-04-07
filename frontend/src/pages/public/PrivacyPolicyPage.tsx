export function PrivacyPolicyPage() {
  return (
    <div className="page-shell">
      <section className="section-card prose-card">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Privacy</span>
            <h1>Privacy policy</h1>
            <p>How HarborLight Nexus collects, uses, and safeguards supporter, staff, and resident-related information.</p>
          </div>
        </div>

        <p>
          HarborLight Nexus processes supporter, donation, resident-care, and outreach data to operate nonprofit services,
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

        <h2>How access is controlled</h2>
        <p>
          Role-based access keeps staff records separate from donor-facing data. Sensitive resident records are intended for
          authorized staff and administrators only, while public reporting is limited to anonymized and aggregated information.
        </p>

        <h2>Why we use cookies and browser storage</h2>
        <p>
          The site stores a consent preference and, for authenticated users, a session token required to keep the portal signed in.
          These values support basic site operation and are not used to sell personal information or run third-party ad tracking.
        </p>

        <h2>Public reporting and resident privacy</h2>
        <p>
          HarborLight Nexus publishes anonymized impact snapshots to help donors understand how resources are used. These
          summaries are designed to protect the privacy and safety of minors, survivors, staff, and partner organizations.
        </p>
      </section>
    </div>
  );
}
