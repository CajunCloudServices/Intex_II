import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page-shell narrow">
      <section className="section-card prose-card">
        <span className="eyebrow">Not found</span>
        <h1>This page does not exist</h1>
        <p>The route may be wrong or the page has not been scaffolded yet.</p>
        <Link className="primary-button" to="/">
          Back to home
        </Link>
      </section>
    </div>
  );
}
