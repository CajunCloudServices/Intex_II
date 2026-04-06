import { Link } from 'react-router-dom';
import { MetricCard, SectionCard } from '../../components/ui/Cards';

export function HomePage() {
  return (
    <div className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Starter foundation</span>
          <h1>Build the nonprofit app on a clean full-stack baseline.</h1>
          <p>
            HarborLight Nexus ships with public pages, a role-aware portal, PostgreSQL-backed domain models,
            and a straightforward React/.NET separation your team can customize quickly.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/impact">View public impact</Link>
            <Link className="secondary-button" to="/login">Open portal</Link>
          </div>
          <ul className="hero-points">
            <li>Public pages for visitors and donors.</li>
            <li>Role-based portal routes for staff and donors.</li>
            <li>Seeded sample data so the app works immediately.</li>
          </ul>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-grid">
            <MetricCard label="Modules" value="8" detail="Auth, donor ops, resident care, analytics, and privacy scaffolding." />
            <MetricCard label="Roles" value="3" detail="Admin, Staff, and Donor routes with JWT-backed protection." />
            <MetricCard label="Deployment path" value="Docker" detail="Compose stack for Postgres, API, and Vite frontend." />
          </div>
        </div>
      </section>

      <section className="page-grid three">
        <SectionCard title="Donor operations" subtitle="Supporter records, donations, and allocation patterns">
          <p>Structured to cover monetary and broader supporter engagement without locking your team into premature abstractions.</p>
        </SectionCard>
        <SectionCard title="Resident care workflows" subtitle="Case inventory, process recordings, and home visit history">
          <p>Representative domain models are already mapped, seeded, and exposed through role-gated endpoints.</p>
        </SectionCard>
        <SectionCard title="Security starter" subtitle="Practical first pass, not fake completeness">
          <p>HTTPS redirection, JWT auth, RBAC, privacy page, cookie consent, and explicit TODO boundaries for CSP/HSTS hardening.</p>
        </SectionCard>
      </section>

      <section className="page-grid two">
        <SectionCard title="What students can build next" subtitle="The shell stays intentionally simple">
          <ul className="simple-list">
            <li>Form-based create and edit workflows for the data tables.</li>
            <li>Charts that replace the placeholder bars and summary cards.</li>
            <li>Stricter rules for restricted resident notes and audit history.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Quick start accounts" subtitle="Use these immediately after launch">
          <ul className="simple-list">
            <li><strong>Admin:</strong> admin@intex.local / Admin!234567</li>
            <li><strong>Staff:</strong> staff@intex.local / Staff!234567</li>
            <li><strong>Donor:</strong> donor@intex.local / Donor!234567</li>
          </ul>
        </SectionCard>
      </section>
    </div>
  );
}
