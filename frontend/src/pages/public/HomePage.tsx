import { Link } from 'react-router-dom';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import homeHeroImage from '../../assets/generated/home-hero.webp';
import homeSupportSpaceImage from '../../assets/generated/home-support-space.webp';
import homeCommunitySpaceImage from '../../assets/generated/home-community-space.webp';

export function HomePage() {
  return (
    <div className="page-shell home-landing">
      <section className="hero hero--home" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="eyebrow">HarborLight Sanctuary</span>
          <h1 id="hero-heading">Providing safe homes and healing for survivors</h1>
          <p>
            We support girls escaping abuse and trafficking by offering safety, compassionate care, and a path
            forward—one step at a time.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/donate">
              Donate now
            </Link>
            <a className="secondary-button hero-secondary" href="#mission">
              Learn more
            </a>
          </div>
          <ul className="hero-points">
            <li>Trauma-informed care in a calm, structured environment.</li>
            <li>Transparent operations you can read about on our impact page.</li>
            <li>Community-funded: donors make this work possible.</li>
          </ul>
        </div>
        <div className="hero-panel hero-panel--soft">
          <figure className="hero-aside-card hero-aside-card--image">
            <img
              className="editorial-image"
              src={homeHeroImage}
              alt="A welcoming safe home at dusk with warm light, mountain views, and a calm garden path."
            />
            <figcaption>Safe, welcoming homes are the foundation of every recovery plan.</figcaption>
          </figure>
        </div>
      </section>

      <div id="mission" className="home-section" role="region" aria-labelledby="mission-heading">
        <SectionCard
          titleId="mission-heading"
          title="Our mission"
          subtitle="Who we serve, what we do, and why it matters"
        >
          <div className="mission-columns">
            <div>
              <h3 className="home-subheading">Who we help</h3>
              <p>
                Girls and young women who have experienced sexual abuse or trafficking—and who deserve a safe
                place to rest, recover, and rebuild.
              </p>
            </div>
            <div>
              <h3 className="home-subheading">What we do</h3>
              <p>
                We provide housing, counseling, education, and practical support through a small network of homes
                and trusted partners.
              </p>
            </div>
            <div>
              <h3 className="home-subheading">Why it matters</h3>
              <p>
                Stability and trust are the foundation of healing. When basic needs are met and care is consistent,
                young people can focus on their future—not just survival.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <section className="home-section home-feature-split" aria-labelledby="care-environment-heading">
        <figure className="editorial-media home-feature-media">
          <img
            className="editorial-image"
            src={homeSupportSpaceImage}
            alt="A bright counseling and study space with books, soft chairs, natural light, and a calm learning environment."
          />
        </figure>
        <SectionCard
          titleId="care-environment-heading"
          title="Healing happens in everyday spaces"
          subtitle="Recovery is supported by routine, safety, and room to breathe"
        >
          <p>
            HarborLight homes are designed to feel calm and lived in. Residents move between counseling,
            study time, meals, and quiet rest in spaces that emphasize stability rather than crisis.
          </p>
          <p>
            That steady rhythm matters. A consistent environment helps young people rebuild trust, practice new
            routines, and engage with school, therapy, and life-skills work without feeling overwhelmed.
          </p>
        </SectionCard>
      </section>

      <section className="home-section" aria-labelledby="services-heading">
        <div className="home-section-intro">
          <h2 id="services-heading">What we do</h2>
          <p className="home-section-lead">
            Services are tailored to each resident. Every plan emphasizes safety, dignity, and steady progress.
          </p>
        </div>
        <div className="page-grid four">
          <SectionCard title="Safe housing" subtitle="A calm place to stabilize and feel secure">
            <p>
              Residents live in supervised homes designed for routine, privacy, and community—not isolation—with
              staff available when support is needed.
            </p>
          </SectionCard>
          <SectionCard title="Counseling & therapy" subtitle="Healing with trained professionals">
            <p>
              Individual and group sessions help process trauma, build coping skills, and restore a sense of
              agency at a sustainable pace.
            </p>
          </SectionCard>
          <SectionCard title="Education & life skills" subtitle="Preparing for independence">
            <p>
              We support schooling, tutoring, and everyday skills—from budgeting to health—so residents can step
              into adulthood with confidence.
            </p>
          </SectionCard>
          <SectionCard title="Reintegration support" subtitle="Planning for what comes next">
            <p>
              Transition planning includes housing referrals, employment support, and ongoing check-ins so no one
              leaves without a network to lean on.
            </p>
          </SectionCard>
        </div>
      </section>

      <section className="home-section home-feature-split home-feature-split--reverse" aria-labelledby="community-heading">
        <SectionCard
          titleId="community-heading"
          title="Homes built around belonging"
          subtitle="Care includes the ordinary moments that make a place feel safe"
        >
          <p>
            Shared meals, evening routines, and supportive check-ins are part of how HarborLight creates a sense
            of home. Recovery is not just clinical care. It is also consistency, warmth, and the ability to
            participate in daily life without fear.
          </p>
          <p>
            Donor support helps cover the practical details behind that stability: food, linens, utilities,
            transportation, school supplies, and the quiet operational work that keeps every residence steady.
          </p>
        </SectionCard>
        <figure className="editorial-media home-feature-media">
          <img
            className="editorial-image"
            src={homeCommunitySpaceImage}
            alt="A warm communal dining and living area with lamplight, flowers, and a welcoming shared table."
          />
        </figure>
      </section>

      <section id="impact" className="home-section" aria-labelledby="impact-heading">
        <div className="home-section-intro">
          <h2 id="impact-heading">Impact at a glance</h2>
          <p className="home-section-lead">
            Numbers are only one part of the story—but they help show capacity, reach, and the trust donors place
            in our work.
          </p>
        </div>
        <div className="page-grid three">
          <MetricCard label="Young people supported" value="150+" detail="Total residents served through our programs to date." />
          <MetricCard label="Safe homes" value="3" detail="Active residences offering 24/7 staff coverage and structured care." />
          <MetricCard
            label="Reintegration"
            value="90%"
            detail="Residents who successfully transition to independent or step-down housing within program goals."
            accent
          />
        </div>
      </section>

      <section className="home-section" aria-labelledby="cta-heading">
        <div className="cta-band">
          <h2 id="cta-heading">You can make a difference</h2>
          <p>
            Your generosity funds beds, counseling hours, and the quiet, everyday costs of keeping a home safe.
            Whether you give once or volunteer time, you help a young person feel seen.
          </p>
          <div className="hero-actions cta-band-actions">
            <Link className="primary-button" to="/donate">
              Donate
            </Link>
            <Link className="secondary-button" to="/login">
              Get involved
            </Link>
          </div>
        </div>
      </section>

      <div id="about" className="home-section" role="region" aria-labelledby="about-heading">
        <SectionCard
          titleId="about-heading"
          title="About HarborLight"
          subtitle="People, place, and how we work"
        >
          <p>
            HarborLight Sanctuary is led by a nonprofit board and an experienced program director. We operate
            primarily in the Mountain West and partner with licensed therapists, schools, and local agencies so
            care stays coordinated and accountable.
          </p>
          <p>
            Funding comes from individual donors, foundations, and community events. We publish high-level impact
            updates so supporters can see how resources are used—without exposing private resident details.
          </p>
          <p className="home-muted">
            <Link to="/impact">View the public impact dashboard</Link> for recent snapshots, or{' '}
            <a href="mailto:hello@harborlight.example.org">contact us</a> to learn about partnership opportunities.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
