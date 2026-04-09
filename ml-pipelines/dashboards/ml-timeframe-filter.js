/**
 * Shared timeframe filter for ML dashboards (day-based or month-based windows).
 * Expects markup similar to social-media-dashboard.html (slider + optional quick links).
 */
(function (global) {
  function initTimeframeFilter(cfg) {
    const mode = cfg.mode === "month" ? "month" : "day";
    const slider = document.getElementById(cfg.sliderId);
    const sliderMid = cfg.sliderValueId ? document.getElementById(cfg.sliderValueId) : null;
    const summary = cfg.labelId ? document.getElementById(cfg.labelId) : null;
    if (!slider) return null;

    let isAllTime = false;

    function getLatest(rows) {
      if (cfg.getDatasetLatest) return cfg.getDatasetLatest(rows);
      const ts = rows.map(cfg.getRowDate).filter(Boolean).map((d) => d.getTime());
      if (!ts.length) return new Date();
      return new Date(Math.max.apply(null, ts));
    }

    function filterRows(rows) {
      if (!rows || !rows.length) return [];
      if (isAllTime) return rows.slice();
      const latest = getLatest(rows);
      if (mode === "day") {
        const tfDays = Number(slider.value);
        const minD = new Date(latest);
        minD.setDate(minD.getDate() - tfDays);
        return rows.filter((r) => {
          const d = cfg.getRowDate(r);
          return d && d >= minD;
        });
      }
      const nMonths = Number(slider.value);
      const cutoff = new Date(latest.getFullYear(), latest.getMonth() - nMonths, 1);
      return rows.filter((r) => {
        const d = cfg.getRowDate(r);
        return d && d >= cutoff;
      });
    }

    function refresh() {
      const rows = cfg.getAllRows();
      const filtered = filterRows(rows);
      const n = filtered.length;
      if (mode === "day") {
        const tfDays = Number(slider.value);
        if (sliderMid) sliderMid.textContent = isAllTime ? "All time" : tfDays + " days";
        if (summary) {
          summary.textContent = isAllTime
            ? "Showing: All available dates · " + n + " rows"
            : "Showing: Last " + tfDays + " days · " + n + " rows";
        }
      } else {
        const m = Number(slider.value);
        if (sliderMid) sliderMid.textContent = isAllTime ? "Full history" : m + " months";
        if (summary) {
          summary.textContent = isAllTime
            ? "Showing: Full history · " + n + " rows"
            : "Showing: Last " + m + " months · " + n + " rows";
        }
      }
      cfg.onApply(filtered, { isAllTime: isAllTime, allRows: rows });
    }

    slider.addEventListener("input", function () {
      isAllTime = false;
      refresh();
    });

    const links = cfg.quickLinks || [];
    links.forEach(function (q) {
      const el = document.getElementById(q.id);
      if (!el) return;
      el.addEventListener("click", function () {
        if (q.allTime) {
          isAllTime = true;
        } else {
          isAllTime = false;
          if (q.days != null) slider.value = String(q.days);
          if (q.months != null) slider.value = String(q.months);
        }
        refresh();
      });
    });

    refresh();

    return {
      refresh: refresh,
      getFiltered: function () {
        return filterRows(cfg.getAllRows());
      },
      setAllTime: function (v) {
        isAllTime = !!v;
        refresh();
      },
    };
  }

  global.initTimeframeFilter = initTimeframeFilter;
})(typeof window !== "undefined" ? window : globalThis);
