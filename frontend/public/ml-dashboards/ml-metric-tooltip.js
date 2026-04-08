/**
 * Positions KPI metric tooltips with position:fixed and clamps to the viewport
 * so they are not clipped by the sidebar, main overflow, or card edges.
 */
(function () {
  const PAD = 12;
  const GAP = 8;
  let openWrap = null;

  function positionTip(wrap) {
    const tip = wrap.querySelector(".metric-tooltip");
    const btn = wrap.querySelector(".metric-info");
    if (!tip || !btn) return;

    tip.style.display = "block";
    tip.style.position = "fixed";
    tip.style.transform = "none";
    tip.style.boxSizing = "border-box";
    tip.style.width = "min(340px, calc(100vw - " + PAD * 2 + "px))";
    tip.style.maxWidth = "calc(100vw - " + PAD * 2 + "px)";
    tip.style.zIndex = "100050";
    tip.style.visibility = "hidden";

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const br = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = br.left + br.width / 2 - tw / 2;
    left = Math.max(PAD, Math.min(left, vw - tw - PAD));

    let top = br.top - th - GAP;
    if (top < PAD) {
      top = br.bottom + GAP;
    }
    if (top + th > vh - PAD) {
      top = vh - th - PAD;
    }
    top = Math.max(PAD, top);

    tip.style.left = left + "px";
    tip.style.top = top + "px";
    tip.style.visibility = "visible";
  }

  function hide() {
    if (!openWrap) return;
    const tip = openWrap.querySelector(".metric-tooltip");
    if (tip) {
      tip.style.display = "none";
      tip.style.visibility = "";
      tip.style.left = "";
      tip.style.top = "";
      tip.style.width = "";
      tip.style.maxWidth = "";
      tip.style.zIndex = "";
      tip.style.position = "";
      tip.style.transform = "";
      tip.style.boxSizing = "";
    }
    openWrap = null;
  }

  function showFor(wrap) {
    if (!wrap) return;
    if (openWrap === wrap) return;
    hide();
    openWrap = wrap;
    window.requestAnimationFrame(function () {
      if (openWrap === wrap) positionTip(wrap);
    });
  }

  document.addEventListener(
    "mouseover",
    function (e) {
      const wrap = e.target.closest(".metric-info-wrap");
      if (wrap) showFor(wrap);
    },
    true
  );

  document.addEventListener(
    "mouseout",
    function (e) {
      const wrap = e.target.closest(".metric-info-wrap");
      if (!wrap || openWrap !== wrap) return;
      const to = e.relatedTarget;
      if (!to || !wrap.contains(to)) hide();
    },
    true
  );

  document.addEventListener("focusin", function (e) {
    const wrap = e.target.closest(".metric-info-wrap");
    if (wrap && e.target.classList.contains("metric-info")) showFor(wrap);
  });

  document.addEventListener("focusout", function () {
    queueMicrotask(function () {
      const a = document.activeElement;
      if (!openWrap) return;
      if (a && openWrap.contains(a)) return;
      hide();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide();
  });

  window.addEventListener(
    "scroll",
    function () {
      if (openWrap) positionTip(openWrap);
    },
    true
  );

  window.addEventListener("resize", function () {
    if (openWrap) positionTip(openWrap);
  });
})();
