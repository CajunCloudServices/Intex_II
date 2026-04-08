import { useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

function setIframeHeightToContent(iframe: HTMLIFrameElement | null) {
  if (!iframe?.contentDocument?.body) return;
  const doc = iframe.contentDocument;
  const h = Math.max(
    doc.body.scrollHeight,
    doc.documentElement.scrollHeight,
  );
  iframe.style.height = `${h}px`;
}

export function MlInsightsDashboardPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const { dashboardKey } = useParams();
  const base = import.meta.env.BASE_URL;
  const dashboardPathByKey: Record<string, string> = {
    counseling: 'counseling-admin-dashboard.html',
    donor: 'donor-churn-dashboard.html',
    reintegration: 'reintegration-dashboard.html',
    social: 'social-media-dashboard.html',
  };
  const selectedPath = dashboardPathByKey[dashboardKey ?? ''] ?? 'counseling-admin-dashboard.html';
  const src = `${base}ml-dashboards/${selectedPath}?embed=1`;

  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (!iframe?.contentDocument?.body) return;

    const update = () => setIframeHeightToContent(iframe);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(iframe.contentDocument.body);
    resizeObserverRef.current = ro;
  }, [src]);

  useEffect(
    () => () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    },
    [],
  );

  return (
    <div className="ml-insights-page">
      <iframe
        ref={iframeRef}
        className="ml-insights-frame"
        title="Tanglaw ML insight dashboards"
        src={src}
        onLoad={onIframeLoad}
      />
    </div>
  );
}
