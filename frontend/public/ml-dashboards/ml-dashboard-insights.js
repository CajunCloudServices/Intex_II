/**
 * Renders the “insights first” hero for ml-pipelines dashboards.
 * Copy is written for nonprofit staff, not data scientists.
 */
(function (global) {
  function esc(s) {
    if (s == null || s === "") return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function renderInsightStory(container, insights, options) {
    if (!container || !insights) return;
    const opts = options || {};
    const predKickerDefault = opts.predKickerDefault || "Predictive signal";
    const causeKickerDefault = opts.causeKickerDefault || "Pattern in records";

    const predCards = (insights.prediction_cards || [])
      .map(
        (c) => `
      <article class="insight-stat-card">
        <p class="insight-stat-kicker">${esc(c.kicker || predKickerDefault)}</p>
        <p class="insight-stat-label">${esc(c.label)}</p>
        <p class="insight-stat-value">${esc(c.value)}</p>
        <p class="insight-stat-hint">${esc(c.hint)}</p>
      </article>
    `
      )
      .join("");

    const causeCards = (insights.cause_cards || [])
      .map(
        (c) => `
      <article class="insight-cause-card">
        <p class="insight-cause-kicker">${esc(c.kicker || causeKickerDefault)}</p>
        <h3 class="insight-cause-title">${esc(c.title)}</h3>
        <p class="insight-cause-body">${esc(c.body)}</p>
      </article>
    `
      )
      .join("");

    const drivers = (insights.model_drivers || [])
      .map((d) => {
        const w = Math.min(100, Math.max(4, d.share_top5_pct || 0));
        return `
        <div class="insight-driver">
          <div class="insight-driver-top">
            <span class="insight-driver-name">${esc(d.feature)}</span>
            <span class="insight-driver-pct">${esc(d.share_top5_pct)}% of top 5 signals</span>
          </div>
          <div class="insight-driver-bar"><i style="width:${w}%"></i></div>
        </div>`;
      })
      .join("");

    const ctas = (insights.calls_to_action || [])
      .map((t) => `<li>${esc(t)}</li>`)
      .join("");

    const ctaBlock =
      ctas
        ? `<section class="insight-cta" aria-label="Suggested follow-ups">
        <h3 class="insight-cta-title">Suggested follow-ups</h3>
        <ul class="insight-cta-list">${ctas}</ul>
      </section>`
        : "";

    const heroBlock = `
      <header class="insight-hero">
        <p class="insight-eyebrow">${esc(insights.eyebrow)}</p>
        <h2 class="insight-headline">${esc(insights.headline)}</h2>
        <p class="insight-lede">${esc(insights.lede)}</p>
      </header>`;

    const predSection = predCards
      ? `<section class="insight-deck" aria-label="Predictive metrics">
        <h3 class="insight-section-title">${esc(opts.predSectionTitle || "Scores and predictions")}</h3>
        <div class="insight-stat-grid">${predCards}</div>
      </section>`
      : "";

    const causeSection = causeCards
      ? `<section class="insight-deck" aria-label="Patterns in records">
        <h3 class="insight-section-title">${esc(opts.causeSectionTitle || "Patterns in the data (associations, not proof of cause)")}</h3>
        <div class="insight-cause-grid">${causeCards}</div>
      </section>`
      : "";

    const driversSection = drivers
      ? `<section class="insight-deck insight-drivers-wrap" aria-label="What most influenced concern scores">
        <h3 class="insight-section-title">${esc(opts.driversSectionTitle || "What the scoring leaned on most")}</h3>
        <p class="insight-drivers-note">${esc(
          opts.driversNote ||
            "These bars show which fields the concern score relied on most when ranking sessions. That is not the same as saying those factors caused a concern."
        )}</p>
        <div class="insight-drivers">${drivers}</div>
      </section>`
      : "";

    if (opts.followupsFirst) {
      container.innerHTML = `${ctaBlock}${heroBlock}${predSection}${causeSection}${driversSection}`;
    } else {
      container.innerHTML = `${heroBlock}${predSection}${causeSection}${driversSection}${ctaBlock}`;
    }
  }

  global.renderInsightStory = renderInsightStory;
})(window);
