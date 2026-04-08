import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { ErrorState, LoadingState } from '../../components/ui/PageState';

type TabKey = 'counseling-dashboard-data' | 'donor-dashboard-data' | 'reintegration-dashboard-data' | 'social-dashboard-data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'counseling-dashboard-data', label: 'Counseling' },
  { key: 'donor-dashboard-data', label: 'Donor' },
  { key: 'reintegration-dashboard-data', label: 'Reintegration' },
  { key: 'social-dashboard-data', label: 'Social' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function InsightHero({ insights }: { insights: Record<string, unknown> }) {
  const eyebrow = typeof insights.eyebrow === 'string' ? insights.eyebrow : null;
  const headline = typeof insights.headline === 'string' ? insights.headline : null;
  const lede = typeof insights.lede === 'string' ? insights.lede : null;

  if (!headline && !lede) return null;

  return (
    <header className="ml-insights-hero">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {headline ? <h2>{headline}</h2> : null}
      {lede ? <p className="home-muted">{lede}</p> : null}
    </header>
  );
}

function MetricCards({ items }: { items: unknown }) {
  if (!Array.isArray(items)) return null;
  return (
    <div className="page-grid three">
      {items.slice(0, 12).map((raw, index) => {
        if (!isRecord(raw)) return null;
        const kicker = typeof raw.kicker === 'string' ? raw.kicker : 'Insight';
        const label = typeof raw.label === 'string' ? raw.label : '';
        const value = typeof raw.value === 'string' || typeof raw.value === 'number' ? String(raw.value) : '';
        const hint = typeof raw.hint === 'string' ? raw.hint : '';
        return (
          <div className="section-card metric-card" key={`${kicker}-${index}`}>
            <p className="eyebrow">{kicker}</p>
            <h3>{value}</h3>
            <p className="detail-inner-label">{label}</p>
            {hint ? <p className="muted-inline">{hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function CauseCards({ items }: { items: unknown }) {
  if (!Array.isArray(items)) return null;
  return (
    <div className="page-grid two">
      {items.slice(0, 8).map((raw, index) => {
        if (!isRecord(raw)) return null;
        const kicker = typeof raw.kicker === 'string' ? raw.kicker : '';
        const title = typeof raw.title === 'string' ? raw.title : '';
        const body = typeof raw.body === 'string' ? raw.body : '';
        return (
          <div className="section-card" key={`${title}-${index}`}>
            <p className="eyebrow">{kicker}</p>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        );
      })}
    </div>
  );
}

function DriverTable({ rows }: { rows: unknown }) {
  if (!Array.isArray(rows)) return null;
  const slice = rows.slice(0, 15);
  return (
    <div className="section-card">
      <h3>Model drivers (top signals)</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <caption>Feature importance</caption>
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Importance</th>
              <th scope="col">Share (top 5)</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((raw, index) => {
              if (!isRecord(raw)) return null;
              const feature = typeof raw.feature === 'string' ? raw.feature : '';
              const importance = typeof raw.importance === 'number' ? raw.importance.toFixed(4) : '';
              const share = typeof raw.share_top5_pct === 'number' ? `${raw.share_top5_pct}%` : '';
              return (
                <tr key={`${feature}-${index}`}>
                  <td>{feature}</td>
                  <td>{importance}</td>
                  <td>{share}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortfolioSummary({ portfolio }: { portfolio: unknown }) {
  if (!isRecord(portfolio)) return null;
  const keys = Object.keys(portfolio).slice(0, 12);
  if (keys.length === 0) return null;
  return (
    <div className="section-card">
      <h3>Portfolio summary</h3>
      <ul className="detail-inner-list">
        {keys.map((key) => (
          <li key={key}>
            <strong>{key}</strong>: {String(portfolio[key])}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MlInsightsDashboardPage() {
  const [tab, setTab] = useState<TabKey>('counseling-dashboard-data');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (key: TabKey) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.getDashboardData(key);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Unable to load ML dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const insights = data && isRecord(data.insights) ? data.insights : null;
  const note = typeof data?.generated_note === 'string' ? data.generated_note : null;

  return (
    <div className="page-shell ml-insights-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Machine learning</span>
          <h1>ML insights</h1>
          <p>Pipeline outputs for staff review. Data is loaded over an authenticated API — not from public static files.</p>
        </div>
      </div>

      <div className="filter-row" role="tablist" aria-label="ML dashboard datasets">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={item.key === tab ? 'primary-button' : 'ghost-button'}
            onClick={() => setTab(item.key)}
            role="tab"
            aria-selected={item.key === tab}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {note ? <p className="muted-inline">{note}</p> : null}

      {loading ? <LoadingState label="Loading ML dashboard..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load(tab)} /> : null}
      {!loading && !error && data ? (
        <>
          {insights ? <InsightHero insights={insights} /> : null}
          {insights ? <MetricCards items={insights.prediction_cards} /> : null}
          {insights ? <CauseCards items={insights.cause_cards} /> : null}
          {insights ? <DriverTable rows={insights.model_drivers} /> : null}
          <PortfolioSummary portfolio={data.portfolio} />
          {data.residents && Array.isArray(data.residents) ? (
            <p className="muted-inline">Resident-level rows: {data.residents.length} (detail omitted in UI for performance).</p>
          ) : null}
          {data.sessions && Array.isArray(data.sessions) ? (
            <p className="muted-inline">Session-level rows: {data.sessions.length} (detail omitted in UI for performance).</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
