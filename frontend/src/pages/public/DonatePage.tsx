import { Link } from 'react-router-dom';
import { SectionCard } from '../../components/ui/Cards';

/**
 * Public donation entry point (placeholder).
 * Wire this route to your real payment flow when ready—no backend logic here.
 */
export function DonatePage() {
  return (
    <div className="page-shell narrow donate-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Support our work</span>
          <h1>Donate</h1>
          <p>
            Online giving is not yet connected in this demo app. In production, this page would host your secure
            donation form or link to your processor (for example, a hosted checkout).
          </p>
        </div>
      </div>

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
    </div>
  );
}
