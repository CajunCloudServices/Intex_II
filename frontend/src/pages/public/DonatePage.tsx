import { Link } from 'react-router-dom';
import { SectionCard } from '../../components/ui/Cards';
import donateSupportImage from '../../assets/generated/donate-support.webp';

export function DonatePage() {
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
    </div>
  );
}
