import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { SafehouseRequest } from '../../api/types';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { SectionCard } from '../../components/ui/Cards';
import { useAuth } from '../../hooks/useAuth';

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

export function SafehouseNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [safehouseForm, setSafehouseForm] = useState<SafehouseRequest>(createSafehouseForm());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await api.createSafehouse(safehouseForm);
      navigate('/portal/reports');
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Safehouse save failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Create safehouse</h1>
          <p>Add a new safehouse location used for occupancy, incident, and allocation reporting.</p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/portal/reports">
            Back to reports
          </Link>
        </div>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <SectionCard title="Safehouse details" subtitle="Maintain the safehouse records used for occupancy, incident, and allocation reporting.">
        <form className="stack-form" onSubmit={handleSubmit}>
          <FormSection title="Location & status">
            <FormGrid>
              <label htmlFor="sh-code"><span>Code</span><input id="sh-code" value={safehouseForm.code} onChange={(e) => setSafehouseForm({ ...safehouseForm, code: e.target.value })} required /></label>
              <label htmlFor="sh-name"><span>Name</span><input id="sh-name" value={safehouseForm.name} onChange={(e) => setSafehouseForm({ ...safehouseForm, name: e.target.value })} required /></label>
              <label htmlFor="sh-region"><span>Region</span><input id="sh-region" value={safehouseForm.region} onChange={(e) => setSafehouseForm({ ...safehouseForm, region: e.target.value })} required /></label>
              <label htmlFor="sh-city"><span>City</span><input id="sh-city" value={safehouseForm.city} onChange={(e) => setSafehouseForm({ ...safehouseForm, city: e.target.value })} required /></label>
              <label htmlFor="sh-province"><span>Province</span><input id="sh-province" value={safehouseForm.province} onChange={(e) => setSafehouseForm({ ...safehouseForm, province: e.target.value })} required /></label>
              <label htmlFor="sh-country"><span>Country</span><input id="sh-country" value={safehouseForm.country} onChange={(e) => setSafehouseForm({ ...safehouseForm, country: e.target.value })} required /></label>
              <label htmlFor="sh-open-date"><span>Open date</span><input id="sh-open-date" type="date" value={safehouseForm.openDate} onChange={(e) => setSafehouseForm({ ...safehouseForm, openDate: e.target.value })} required /></label>
              <label htmlFor="sh-status"><span>Status</span><input id="sh-status" value={safehouseForm.status} onChange={(e) => setSafehouseForm({ ...safehouseForm, status: e.target.value })} required /></label>
              <label htmlFor="sh-capacity-girls"><span>Capacity (girls)</span><input id="sh-capacity-girls" type="number" min="0" value={safehouseForm.capacityGirls} onChange={(e) => setSafehouseForm({ ...safehouseForm, capacityGirls: Number(e.target.value) })} required /></label>
              <label htmlFor="sh-capacity-staff"><span>Capacity (staff)</span><input id="sh-capacity-staff" type="number" min="0" value={safehouseForm.capacityStaff} onChange={(e) => setSafehouseForm({ ...safehouseForm, capacityStaff: Number(e.target.value) })} required /></label>
              <label htmlFor="sh-occupancy"><span>Current occupancy</span><input id="sh-occupancy" type="number" min="0" value={safehouseForm.currentOccupancy} onChange={(e) => setSafehouseForm({ ...safehouseForm, currentOccupancy: Number(e.target.value) })} required /></label>
            </FormGrid>
          </FormSection>
          <label htmlFor="sh-notes"><span>Notes</span><textarea id="sh-notes" value={safehouseForm.notes ?? ''} onChange={(e) => setSafehouseForm({ ...safehouseForm, notes: e.target.value })} rows={3} /></label>
          <div className="form-actions">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? 'Saving...' : 'Create safehouse'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
