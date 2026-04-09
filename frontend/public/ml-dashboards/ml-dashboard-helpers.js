/**
 * Shared helpers for static ML dashboard HTML (escapeHtml, metric info icons).
 * Load after ml-metric-tooltip.js so hover positioning works on injected markup.
 */
(function (global) {
  function escapeHtml(s) {
    if (s == null || s === "") return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function infoIcon(msg) {
    const m = escapeHtml(msg);
    return (
      '<span class="metric-info-wrap">' +
      '<button type="button" class="metric-info" data-info="' +
      m +
      '" aria-label="' +
      m +
      '" title="' +
      m +
      '">i</button>' +
      '<span class="metric-tooltip" role="tooltip">' +
      m +
      "</span></span>"
    );
  }

  global.MlDashboardHelpers = {
    escapeHtml: escapeHtml,
    infoIcon: infoIcon,
  };
})(typeof window !== "undefined" ? window : globalThis);
