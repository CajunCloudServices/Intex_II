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

  function renderInsightStory(container, insights) {
    if (!container || !insights) return;

    const predCards = (insights.prediction_cards || [])
      .map(
        (c) => `
      <article class="insight-stat-card">
        <p class="insight-stat-kicker">What the computer flagged</p>
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
        <p class="insight-cause-kicker">What the numbers suggest</p>
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

    container.innerHTML = `
      <header class="insight-hero">
        <p class="insight-eyebrow">${esc(insights.eyebrow)}</p>
        <h2 class="insight-headline">${esc(insights.headline)}</h2>
        <p class="insight-lede">${esc(insights.lede)}</p>
      </header>

      <section class="insight-deck" aria-label="Automated risk and prediction summaries">
        <h3 class="insight-section-title">Headlines from the automated review</h3>
        <div class="insight-stat-grid">${predCards}</div>
      </section>

      <section class="insight-deck" aria-label="Patterns in your records">
        <h3 class="insight-section-title">Patterns worth knowing (not proof of cause)</h3>
        <div class="insight-cause-grid">${causeCards}</div>
      </section>

      <section class="insight-deck insight-drivers-wrap" aria-label="What the tool weighed most heavily">
        <h3 class="insight-section-title">What the tool paid the most attention to</h3>
        <p class="insight-drivers-note">These bars show which pieces of information the system relied on most when making its scores—like which clues it looked at first. This is not the same as “what caused” an outcome.</p>
        <div class="insight-drivers">${drivers}</div>
      </section>

      ${
        ctas
          ? `<section class="insight-cta" aria-label="Suggested follow-ups">
        <h3 class="insight-cta-title">Suggested follow-ups</h3>
        <ul class="insight-cta-list">${ctas}</ul>
      </section>`
          : ""
      }
    `;
  }

  global.renderInsightStory = renderInsightStory;
})(window);
