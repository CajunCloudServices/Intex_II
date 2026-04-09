import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { IncidentReportRequest, Resident, Safehouse } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { SectionCard } from '../../components/ui/Cards';
import { LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';

function createIncidentForm(residentId?: number, safehouseId?: number): IncidentReportRequest {
  return {
    residentId: residentId ?? 1,
    safehouseId: safehouseId ?? 1,
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentType: 'Safety',
    severity: 'Medium',
    description: '',
    responseTaken: '',
    resolved: false,
    resolutionDate: '',
    reportedBy: '',
    followUpRequired: true,
  };
}

export function IncidentNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentForm, setIncidentForm] = useState<IncidentReportRequest>(createIncidentForm());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [residentData, safehouseData] = await Promise.all([api.residents(), api.safehouses()]);
        if (cancelled) return;
        setResidents(residentData);
        setSafehouses(safehouseData);
        setIncidentForm((current) =>
          current.residentId > 0 ? current : createIncidentForm(residentData[0]?.id, safehouseData[0]?.id),
        );
      } catch (err) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load form data.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Memoized so the select options list doesn't re-render on every keystroke
  const residentOptions = useMemo(() => residents.map((r) => ({ id: r.id, label: r.caseControlNumber })), [residents]);
  const safehouseOptions = useMemo(() => safehouses.map((s) => ({ id: s.id, label: s.name })), [safehouses]);

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        ...incidentForm,
        resolutionDate: incidentForm.resolutionDate || null,
      };
      await api.createIncident(payload);
      navigate('/portal/reports');
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Incident save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Create incident</h1>
          <p>Maintain incident records used in the watchlist and safehouse performance reporting.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/reports">
            Back to reports
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading residents and safehouses..." />
      ) : (
        <SectionCard title="Incident details" subtitle="Maintain incident records used in the watchlist and safehouse performance reporting.">
          <form className="stack-form" onSubmit={handleSubmit}>
            <FormSection title="Incident information">
              <FormGrid>
                <label htmlFor="inc-resident">
                  <span>Resident</span>
                  <select id="inc-resident" value={incidentForm.residentId} onChange={(e) => setIncidentForm({ ...incidentForm, residentId: Number(e.target.value) })}>
                    {residentOptions.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="inc-safehouse">
                  <span>Safehouse</span>
                  <select id="inc-safehouse" value={incidentForm.safehouseId} onChange={(e) => setIncidentForm({ ...incidentForm, safehouseId: Number(e.target.value) })}>
                    {safehouseOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="inc-date"><span>Incident date</span><input id="inc-date" type="date" value={incidentForm.incidentDate} onChange={(e) => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })} required /></label>
                <label htmlFor="inc-type"><span>Incident type</span><input id="inc-type" value={incidentForm.incidentType} onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })} required /></label>
                <label htmlFor="inc-severity"><span>Severity</span><input id="inc-severity" value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })} required /></label>
                <label htmlFor="inc-reported-by"><span>Reported by</span><input id="inc-reported-by" value={incidentForm.reportedBy} onChange={(e) => setIncidentForm({ ...incidentForm, reportedBy: e.target.value })} required /></label>
              </FormGrid>
            </FormSection>
            <label htmlFor="inc-description"><span>Description</span><textarea id="inc-description" value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} rows={3} required /></label>
            <label htmlFor="inc-response"><span>Response taken</span><textarea id="inc-response" value={incidentForm.responseTaken} onChange={(e) => setIncidentForm({ ...incidentForm, responseTaken: e.target.value })} rows={3} required /></label>
            <div className="check-grid">
              <CheckboxField label="Resolved" checked={incidentForm.resolved} onChange={(checked) => setIncidentForm({ ...incidentForm, resolved: checked })} />
              <CheckboxField label="Follow-up required" checked={incidentForm.followUpRequired} onChange={(checked) => setIncidentForm({ ...incidentForm, followUpRequired: checked })} />
            </div>
            <label htmlFor="inc-resolution-date"><span>Resolution date</span><input id="inc-resolution-date" type="date" value={incidentForm.resolutionDate ?? ''} onChange={(e) => setIncidentForm({ ...incidentForm, resolutionDate: e.target.value })} /></label>
            <div className="form-actions">
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? 'Saving...' : 'Create incident'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
