import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { IncidentReport, IncidentReportRequest, Resident, Safehouse, SafehouseRequest } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { CheckboxField, FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';

type AnalyticsPayload = {
  donationAllocationsBySafehouse?: Array<{ safehouse: string; totalAllocated: number }>;
  socialPerformance?: Array<{ platform: string; postType: string; engagementRate: number; donationReferrals: number }>;
};

function createSafehouseForm(): SafehouseRequest {
  return {
    code: '',
    name: '',
    region: '',
    city: '',
    province: '',
    country: 'Philippines',
    openDate: new Date().toISOString().slice(0, 10),
    status: 'Active',
    capacityGirls: 24,
    capacityStaff: 8,
    currentOccupancy: 0,
    notes: '',
  };
}

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

export function ReportsAnalyticsPage() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsPayload>({});
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [safehouseStatusFilter, setSafehouseStatusFilter] = useState('All');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('All');
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [editingSafehouseId, setEditingSafehouseId] = useState<number | null>(null);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [safehouseForm, setSafehouseForm] = useState<SafehouseRequest>(createSafehouseForm());
  const [incidentForm, setIncidentForm] = useState<IncidentReportRequest>(createIncidentForm());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const deferredIncidentSearch = useDeferredValue(incidentSearch);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadAnalytics = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [analyticsData, safehouseData, incidentData, residentData] = await Promise.all([
        api.dashboardAnalytics(token),
        api.safehouses(token),
        api.incidents(token),
        api.residents(token),
      ]);
      setAnalytics(analyticsData as AnalyticsPayload);
      setSafehouses(safehouseData);
      setIncidents(incidentData);
      setResidents(residentData);
      setSelectedIncidentId((current) => current ?? incidentData[0]?.id ?? null);
      setSafehouseForm((current) => current.code ? current : createSafehouseForm());
      setIncidentForm((current) => current.residentId > 0 ? current : createIncidentForm(residentData[0]?.id, safehouseData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [token]);

  if (!token) return null;

  const safehouseTotals = analytics.donationAllocationsBySafehouse ?? [];
  const socialPerformance = analytics.socialPerformance ?? [];
  const totalAllocated = safehouseTotals.reduce((sum, item) => sum + item.totalAllocated, 0);
  const openIncidentCount = incidents.filter((incident) => !incident.resolved).length;
  const followUpIncidentCount = incidents.filter((incident) => incident.followUpRequired).length;
  const filteredSafehouses = safehouses.filter((safehouse) => safehouseStatusFilter === 'All' || safehouse.status === safehouseStatusFilter);
  const normalizedIncidentSearch = normalizeText(deferredIncidentSearch);
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      !normalizedIncidentSearch ||
      normalizeText(incident.residentCode).includes(normalizedIncidentSearch) ||
      normalizeText(incident.safehouseName).includes(normalizedIncidentSearch) ||
      normalizeText(incident.incidentType).includes(normalizedIncidentSearch) ||
      normalizeText(incident.reportedBy).includes(normalizedIncidentSearch);
    const matchesSeverity = incidentSeverityFilter === 'All' || incident.severity === incidentSeverityFilter;
    return matchesSearch && matchesSeverity;
  });
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0] ?? null;

  const resetSafehouseForm = () => {
    setEditingSafehouseId(null);
    setSafehouseForm(createSafehouseForm());
  };

  const resetIncidentForm = () => {
    setEditingIncidentId(null);
    setIncidentForm(createIncidentForm(residents[0]?.id, safehouses[0]?.id));
  };

  const handleSafehouseSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting('safehouse');
    setFeedback(null);

    try {
      const payload = { ...safehouseForm, notes: safehouseForm.notes || null };
      if (editingSafehouseId) {
        await api.updateSafehouse(token, editingSafehouseId, payload);
        setFeedback({ tone: 'success', message: 'Safehouse updated.' });
      } else {
        await api.createSafehouse(token, payload);
        setFeedback({ tone: 'success', message: 'Safehouse created.' });
      }

      resetSafehouseForm();
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Safehouse save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleIncidentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting('incident');
    setFeedback(null);

    try {
      const payload = {
        ...incidentForm,
        resolutionDate: incidentForm.resolutionDate || null,
      };
      if (editingIncidentId) {
        await api.updateIncident(token, editingIncidentId, payload);
        setFeedback({ tone: 'success', message: 'Incident updated.' });
      } else {
        await api.createIncident(token, payload);
        setFeedback({ tone: 'success', message: 'Incident created.' });
      }

      resetIncidentForm();
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Incident save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const deleteSafehouse = async (id: number) => {
    if (!token || !window.confirm('Delete this safehouse? This action requires confirmation.')) return;
    try {
      await api.deleteSafehouse(token, id);
      setFeedback({ tone: 'success', message: 'Safehouse deleted.' });
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Safehouse delete failed.' });
    }
  };

  const deleteIncident = async (id: number) => {
    if (!token || !window.confirm('Delete this incident? This action requires confirmation.')) return;
    try {
      await api.deleteIncident(token, id);
      setFeedback({ tone: 'success', message: 'Incident deleted.' });
      if (selectedIncidentId === id) setSelectedIncidentId(null);
      await loadAnalytics();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Incident delete failed.' });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Decision support</span>
          <h1>Reports & analytics</h1>
          <p>Placeholder report views backed by real aggregate endpoints so your charts have a stable contract.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Safehouses in report" value={String(safehouseTotals.length)} detail="Locations in allocation summary." accent />
        <MetricCard label="Allocated value" value={formatMoney(totalAllocated)} detail="Aggregate across safehouse groups." />
        <MetricCard label="Operational watchlist" value={String(openIncidentCount)} detail={`${followUpIncidentCount} incidents still need follow-up.`} />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading analytics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAnalytics} />
      ) : (
        <>
          <section className="page-grid two dashboard-split">
            <SectionCard title="Allocation comparison" subtitle="This is still lightweight, but it now reads like a real report instead of a placeholder block.">
              {safehouseTotals.length === 0 ? (
                <EmptyState title="No allocation data" message="The analytics endpoint did not return safehouse totals." />
              ) : (
                <div className="chart-list">
                  {safehouseTotals.map((item) => (
                    <div className="chart-row" key={item.safehouse}>
                      <span>{item.safehouse}</span>
                      <div className="chart-bar">
                        <div style={{ width: `${Math.min((item.totalAllocated / Math.max(totalAllocated, 1)) * 100, 100)}%` }} />
                      </div>
                      <strong>{formatMoney(item.totalAllocated)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Outreach signals" subtitle="Quick read on engagement and donation referrals">
              {socialPerformance.length === 0 ? (
                <EmptyState title="No social media data" message="The analytics endpoint did not return outreach rows." />
              ) : (
                <div className="page-grid two compact">
                  {socialPerformance.map((post, index) => (
                    <MetricCard
                      key={`${post.platform}-${index}`}
                      label={`${post.platform} • ${post.postType}`}
                      value={`${Math.round(post.engagementRate * 100)}%`}
                      detail={`${post.donationReferrals} donation referrals`}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Safehouse overview"
              subtitle="Use this section during demos to show operations, occupancy, and location coverage."
              actions={
                <div className="filter-row">
                  <select className="inline-select" value={safehouseStatusFilter} onChange={(event) => setSafehouseStatusFilter(event.target.value)}>
                    <option>All</option>
                    <option>Active</option>
                    <option>Standby</option>
                    <option>Closed</option>
                  </select>
                </div>
              }
            >
              {filteredSafehouses.length === 0 ? (
                <EmptyState title="No matching safehouses" message="Try a different status filter." />
              ) : (
                <DataTable
                  caption="Safehouse operating summary"
                  columns={['Code', 'Location', 'Occupancy', 'Incidents', 'Actions']}
                  rows={filteredSafehouses.map((safehouse) => [
                    safehouse.code,
                    `${safehouse.city}, ${safehouse.province}`,
                    `${safehouse.currentOccupancy}/${safehouse.capacityGirls}`,
                    String(safehouse.incidentCount),
                    <div className="table-actions" key={`safehouse-actions-${safehouse.id}`}>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingSafehouseId(safehouse.id);
                              setSafehouseForm({
                                code: safehouse.code,
                                name: safehouse.name,
                                region: safehouse.region,
                                city: safehouse.city,
                                province: safehouse.province,
                                country: safehouse.country,
                                openDate: safehouse.openDate,
                                status: safehouse.status,
                                capacityGirls: safehouse.capacityGirls,
                                capacityStaff: safehouse.capacityStaff,
                                currentOccupancy: safehouse.currentOccupancy,
                                notes: safehouse.notes ?? '',
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteSafehouse(safehouse.id)} type="button">Delete</button>
                        </>
                      ) : (
                        <span className="muted-inline">Read only</span>
                      )}
                    </div>,
                  ])}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Incident tracker"
              subtitle="Search incidents by resident, safehouse, or incident type."
              actions={
                <div className="filter-row">
                  <input className="inline-search" placeholder="Search incidents..." value={incidentSearch} onChange={(event) => setIncidentSearch(event.target.value)} />
                  <select className="inline-select" value={incidentSeverityFilter} onChange={(event) => setIncidentSeverityFilter(event.target.value)}>
                    <option>All</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              }
            >
              {filteredIncidents.length === 0 ? (
                <EmptyState title="No matching incidents" message="Try a different severity or search term." />
              ) : (
                <DataTable
                  caption="Incident summary"
                  columns={['Date', 'Resident', 'Type', 'Severity', 'Actions']}
                  rows={filteredIncidents.map((incident) => [
                    formatDate(incident.incidentDate),
                    <button className="table-link-button" key={`incident-${incident.id}`} onClick={() => setSelectedIncidentId(incident.id)} type="button">
                      {incident.residentCode}
                    </button>,
                    incident.incidentType,
                    incident.severity,
                    <div className="table-actions" key={`incident-actions-${incident.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedIncidentId(incident.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingIncidentId(incident.id);
                              setIncidentForm({
                                residentId: incident.residentId,
                                safehouseId: incident.safehouseId,
                                incidentDate: incident.incidentDate,
                                incidentType: incident.incidentType,
                                severity: incident.severity,
                                description: incident.description,
                                responseTaken: incident.responseTaken,
                                resolved: incident.resolved,
                                resolutionDate: incident.resolutionDate ?? '',
                                reportedBy: incident.reportedBy,
                                followUpRequired: incident.followUpRequired,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteIncident(incident.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                />
              )}
            </SectionCard>
          </section>

          <section className="page-grid two dashboard-split">
            <DetailPanel title={selectedIncident ? `${selectedIncident.incidentType} incident` : 'Incident details'} subtitle="The detail panel makes the case-management story easier to explain during a walkthrough.">
              {selectedIncident ? (
                <DetailList
                  items={[
                    { label: 'Date', value: formatDate(selectedIncident.incidentDate) },
                    { label: 'Resident', value: selectedIncident.residentCode },
                    { label: 'Safehouse', value: selectedIncident.safehouseName },
                    { label: 'Severity', value: selectedIncident.severity },
                    { label: 'Reported by', value: selectedIncident.reportedBy },
                    { label: 'Description', value: selectedIncident.description },
                    { label: 'Response taken', value: selectedIncident.responseTaken },
                    { label: 'Resolved', value: selectedIncident.resolved ? `Yes${selectedIncident.resolutionDate ? ` on ${formatDate(selectedIncident.resolutionDate)}` : ''}` : 'No' },
                  ]}
                />
              ) : (
                <EmptyState title="No incident selected" message="Choose an incident row to inspect the full record." />
              )}
            </DetailPanel>

            <SectionCard title="Demo talking points" subtitle="This gives your team a plain-English checklist of what to show on this page.">
              <ul className="simple-list">
                <li>Allocation chart proves the dashboard uses real aggregate API contracts.</li>
                <li>Safehouse table shows operations data, occupancy, and incident counts.</li>
                <li>Incident tracker demonstrates role-gated CRUD and detail inspection.</li>
                <li>Search and severity filters give staff a believable review workflow.</li>
              </ul>
            </SectionCard>
          </section>

          {isAdmin ? (
            <>
              <section className="page-grid two dashboard-split">
                <SectionCard
                  title={editingSafehouseId ? 'Edit safehouse' : 'Create safehouse'}
                  subtitle="Keep location records readable and close to the backend DTO."
                  actions={editingSafehouseId ? <button className="ghost-button" onClick={resetSafehouseForm} type="button">Cancel edit</button> : null}
                >
                  <form className="stack-form" onSubmit={handleSafehouseSubmit}>
                    <FormSection title="Location and capacity">
                      <FormGrid>
                        <label><span>Code</span><input value={safehouseForm.code} onChange={(event) => setSafehouseForm({ ...safehouseForm, code: event.target.value })} required /></label>
                        <label><span>Name</span><input value={safehouseForm.name} onChange={(event) => setSafehouseForm({ ...safehouseForm, name: event.target.value })} required /></label>
                        <label><span>Region</span><input value={safehouseForm.region} onChange={(event) => setSafehouseForm({ ...safehouseForm, region: event.target.value })} required /></label>
                        <label><span>City</span><input value={safehouseForm.city} onChange={(event) => setSafehouseForm({ ...safehouseForm, city: event.target.value })} required /></label>
                        <label><span>Province</span><input value={safehouseForm.province} onChange={(event) => setSafehouseForm({ ...safehouseForm, province: event.target.value })} required /></label>
                        <label><span>Country</span><input value={safehouseForm.country} onChange={(event) => setSafehouseForm({ ...safehouseForm, country: event.target.value })} required /></label>
                        <label><span>Open date</span><input type="date" value={safehouseForm.openDate} onChange={(event) => setSafehouseForm({ ...safehouseForm, openDate: event.target.value })} required /></label>
                        <label><span>Status</span><input value={safehouseForm.status} onChange={(event) => setSafehouseForm({ ...safehouseForm, status: event.target.value })} required /></label>
                        <label><span>Capacity (girls)</span><input type="number" min="0" value={safehouseForm.capacityGirls} onChange={(event) => setSafehouseForm({ ...safehouseForm, capacityGirls: Number(event.target.value) })} required /></label>
                        <label><span>Capacity (staff)</span><input type="number" min="0" value={safehouseForm.capacityStaff} onChange={(event) => setSafehouseForm({ ...safehouseForm, capacityStaff: Number(event.target.value) })} required /></label>
                        <label><span>Current occupancy</span><input type="number" min="0" value={safehouseForm.currentOccupancy} onChange={(event) => setSafehouseForm({ ...safehouseForm, currentOccupancy: Number(event.target.value) })} required /></label>
                      </FormGrid>
                    </FormSection>
                    <label><span>Notes</span><textarea value={safehouseForm.notes ?? ''} onChange={(event) => setSafehouseForm({ ...safehouseForm, notes: event.target.value })} rows={3} /></label>
                    <div className="form-actions">
                      <button className="primary-button" disabled={submitting === 'safehouse'} type="submit">
                        {submitting === 'safehouse' ? 'Saving...' : editingSafehouseId ? 'Update safehouse' : 'Create safehouse'}
                      </button>
                    </div>
                  </form>
                </SectionCard>

                <SectionCard
                  title={editingIncidentId ? 'Edit incident' : 'Create incident'}
                  subtitle="The incident form stays intentionally direct so the security and response flow is easy to demo."
                  actions={editingIncidentId ? <button className="ghost-button" onClick={resetIncidentForm} type="button">Cancel edit</button> : null}
                >
                  <form className="stack-form" onSubmit={handleIncidentSubmit}>
                    <FormSection title="Incident metadata">
                      <FormGrid>
                        <label>
                          <span>Resident</span>
                          <select value={incidentForm.residentId} onChange={(event) => setIncidentForm({ ...incidentForm, residentId: Number(event.target.value) })}>
                            {residents.map((resident) => (
                              <option key={resident.id} value={resident.id}>
                                {resident.caseControlNumber}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Safehouse</span>
                          <select value={incidentForm.safehouseId} onChange={(event) => setIncidentForm({ ...incidentForm, safehouseId: Number(event.target.value) })}>
                            {safehouses.map((safehouse) => (
                              <option key={safehouse.id} value={safehouse.id}>
                                {safehouse.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label><span>Incident date</span><input type="date" value={incidentForm.incidentDate} onChange={(event) => setIncidentForm({ ...incidentForm, incidentDate: event.target.value })} required /></label>
                        <label><span>Incident type</span><input value={incidentForm.incidentType} onChange={(event) => setIncidentForm({ ...incidentForm, incidentType: event.target.value })} required /></label>
                        <label><span>Severity</span><input value={incidentForm.severity} onChange={(event) => setIncidentForm({ ...incidentForm, severity: event.target.value })} required /></label>
                        <label><span>Reported by</span><input value={incidentForm.reportedBy} onChange={(event) => setIncidentForm({ ...incidentForm, reportedBy: event.target.value })} required /></label>
                      </FormGrid>
                    </FormSection>
                    <FormSection title="Response and follow-up">
                      <label><span>Description</span><textarea value={incidentForm.description} onChange={(event) => setIncidentForm({ ...incidentForm, description: event.target.value })} rows={3} required /></label>
                      <label><span>Response taken</span><textarea value={incidentForm.responseTaken} onChange={(event) => setIncidentForm({ ...incidentForm, responseTaken: event.target.value })} rows={3} required /></label>
                      <FormGrid>
                        <label><span>Resolution date</span><input type="date" value={incidentForm.resolutionDate ?? ''} onChange={(event) => setIncidentForm({ ...incidentForm, resolutionDate: event.target.value })} /></label>
                      </FormGrid>
                    </FormSection>
                    <div className="check-grid">
                      <CheckboxField label="Resolved" checked={incidentForm.resolved} onChange={(checked) => setIncidentForm({ ...incidentForm, resolved: checked })} />
                      <CheckboxField label="Follow-up required" checked={incidentForm.followUpRequired} onChange={(checked) => setIncidentForm({ ...incidentForm, followUpRequired: checked })} />
                    </div>
                    <div className="form-actions">
                      <button className="primary-button" disabled={submitting === 'incident'} type="submit">
                        {submitting === 'incident' ? 'Saving...' : editingIncidentId ? 'Update incident' : 'Create incident'}
                      </button>
                    </div>
                  </form>
                </SectionCard>
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
