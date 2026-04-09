import { Link } from 'react-router-dom';

function ImpactIcon({ kind }: { kind: 'homes' | 'care' | 'hubs' | 'goal' }) {
  if (kind === 'homes') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M4.5 11 12 5l7.5 6v7.5h-4.75v-4.9H9.25v4.9H4.5z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (kind === 'care') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M12 19.25c-4.15-2.72-7.25-5.44-7.25-9.1 0-2.57 1.8-4.4 4.21-4.4 1.33 0 2.42.53 3.02 1.58.6-1.05 1.69-1.58 3.02-1.58 2.41 0 4.23 1.83 4.23 4.4 0 3.66-3.12 6.38-7.23 9.1Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    );
  }

  if (kind === 'hubs') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="5.5" r="2.25" fill="currentColor" />
        <circle cx="5.5" cy="18" r="2.25" fill="currentColor" />
        <circle cx="18.5" cy="18" r="2.25" fill="currentColor" />
        <path
          d="M12 8.2v4.6M10 14.8l-3 1.7M14 14.8l3 1.7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M8 16.5V13M12 16.5V10M16 16.5V7.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="2.3"
      />
    </svg>
  );
}

export function HomePage() {
  return (
    <div className="page-shell home-landing">
      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="home-hero-copy">
          <span className="eyebrow">Tanglaw Project</span>
          <h1 id="hero-heading">Providing safe homes and healing for survivors</h1>
          <p>
            Inspired by the parol as a symbol of faith and hope, Tanglaw Project supports girls escaping abuse and
            trafficking with sanctuary, trauma-informed care, and a path forward built one steady step at a time.
          </p>
          <div className="home-hero-actions">
            <Link className="primary-button" to="/donate">
              Donate Now
            </Link>
            <Link className="secondary-button" to="/impact">
              Explore Our Impact
            </Link>
          </div>
        </div>

        <div className="home-hero-media" aria-hidden="true">
          <img
            src="/hero-kids.jpg"
            alt=""
            className="home-hero-photo"
            decoding="async"
          />
        </div>
      </section>

      <section id="mission" className="home-covenant" aria-labelledby="mission-heading">
        <div className="home-covenant-inner">
          <span className="eyebrow">Our Covenant</span>
          <h2 id="mission-heading">
            Preserving the human narrative with radical empathy and architectural grace.
          </h2>
          <div className="home-covenant-divider" aria-hidden="true" />
        </div>
      </section>

      <section id="impact" className="home-section home-impact" aria-labelledby="impact-heading">
        <div className="home-impact-header">
          <div>
            <span className="eyebrow">Real-Time Metrics</span>
            <h2 id="impact-heading">Annual Impact Progress</h2>
          </div>
          <p>Illustrative FY 2024 performance snapshot</p>
        </div>

        <div className="home-impact-grid">
          <article className="impact-card impact-card-lavender">
            <div className="impact-card-icon impact-card-icon-lavender">
              <ImpactIcon kind="homes" />
            </div>
            <strong>1,280</strong>
            <span>Families Re-housed</span>
          </article>
          <article className="impact-card impact-card-gold">
            <div className="impact-card-icon impact-card-icon-gold">
              <ImpactIcon kind="care" />
            </div>
            <strong>45k+</strong>
            <span>Support Hours Delivered</span>
          </article>
          <article className="impact-card impact-card-neutral">
            <div className="impact-card-icon impact-card-icon-neutral">
              <ImpactIcon kind="hubs" />
            </div>
            <strong>12</strong>
            <span>Regional Partnerships</span>
          </article>
          <article className="impact-card impact-card-featured">
            <div className="impact-card-icon impact-card-icon-featured impact-card-icon-box">
              <ImpactIcon kind="goal" />
            </div>
            <div className="impact-card-feature-value">85%</div>
            <div className="impact-card-featured-bottom">
              <div className="impact-card-feature-title">Quarterly Impact Goal</div>
            </div>
          </article>
        </div>
      </section>

      <section className="home-section" aria-labelledby="cta-heading">
        <div className="cta-band">
          <div className="cta-band-copy">
            <span className="cta-band-kicker">Support the work</span>
            <h2 id="cta-heading">Join the legacy of intentional change.</h2>
            <p>
              Every contribution funds beds, counseling hours, and the daily work of keeping a home safe,
              dignified, and ready for healing.
            </p>
          </div>
          <div className="hero-actions cta-band-actions">
            <Link className="secondary-button cta-button-dark" to="/login">
              Get Involved
            </Link>
          </div>
        </div>
      </section>

      <div id="about" className="home-section" role="region" aria-labelledby="about-heading">
        <section className="home-about-card">
          <div className="home-about-header">
            <div>
              <span className="eyebrow">About Tanglaw Project</span>
              <h2 id="about-heading">People, place, and how we work</h2>
            </div>
            <p className="home-about-summary">
              A quick guide to who leads the work, how care is coordinated, and how supporters can follow along.
            </p>
          </div>

          <div className="home-about-flow" aria-label="About Tanglaw Project overview">
            <article className="home-about-step">
              <span className="home-about-step-number">01</span>
              <div className="home-about-step-copy">
                <h3>Who leads the work</h3>
                <p>
                  Tanglaw Project is led by a nonprofit board and an experienced program director, giving the
                  organization both community oversight and day-to-day operational leadership.
                </p>
              </div>
            </article>

            <article className="home-about-step">
              <span className="home-about-step-number">02</span>
              <div className="home-about-step-copy">
                <h3>How care stays coordinated</h3>
                <p>
                  We operate primarily in the Mountain West and partner with licensed therapists, schools, and
                  local agencies so each resident’s support network remains connected and accountable.
                </p>
              </div>
            </article>

            <article className="home-about-step">
              <span className="home-about-step-number">03</span>
              <div className="home-about-step-copy">
                <h3>How transparency shows up</h3>
                <p>
                  Funding comes from individual donors, foundations, and community events. We publish high-level
                  impact updates so supporters can see how resources are used without exposing private resident
                  details.
                </p>
              </div>
            </article>
          </div>

          <p className="home-about-links">
            <Link to="/impact">View our Impact</Link>
            <span aria-hidden="true">|</span>
            <a href="mailto:hello@tanglawproject.example.org">Contact Us</a>
          </p>
        </section>
      </div>
    </div>
  );
}
