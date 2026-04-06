import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { Donation, DonationRequest, Safehouse, Supporter, SupporterRequest } from '../../api/types';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { FormGrid, FormSection } from '../../components/ui/FormPrimitives';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';

const defaultSupporterForm: SupporterRequest = {
  supporterType: 'MonetaryDonor',
  displayName: '',
  organizationName: '',
  firstName: '',
  lastName: '',
  relationshipType: 'International',
  region: '',
  country: 'Philippines',
  email: '',
  phone: '',
  status: 'Active',
  firstDonationDate: '',
  acquisitionChannel: 'Website',
};

function createDonationForm(safehouseId?: number): DonationRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    supporterId: 1,
    donationType: 'Monetary',
    donationDate: today,
    channelSource: 'Direct',
    currencyCode: 'USD',
    amount: 100,
    estimatedValue: 100,
    impactUnit: 'pesos',
    isRecurring: false,
    campaignName: '',
    notes: '',
    allocations: [
      {
        safehouseId: safehouseId ?? 1,
        programArea: 'Wellbeing',
        amountAllocated: 100,
        allocationDate: today,
        allocationNotes: '',
      },
    ],
  };
}

export function DonorsContributionsPage() {
  const { token, user } = useAuth();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedSupporterId, setSelectedSupporterId] = useState<number | null>(null);
  const [selectedDonationId, setSelectedDonationId] = useState<number | null>(null);
  const [editingSupporterId, setEditingSupporterId] = useState<number | null>(null);
  const [editingDonationId, setEditingDonationId] = useState<number | null>(null);
  const [supporterForm, setSupporterForm] = useState<SupporterRequest>(defaultSupporterForm);
  const [donationForm, setDonationForm] = useState<DonationRequest>(createDonationForm());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [supportersData, donationsData, safehouseData] = await Promise.all([
        api.supporters(token),
        api.donations(token),
        api.safehouses(token),
      ]);
      setSupporters(supportersData);
      setDonations(donationsData);
      setSafehouses(safehouseData);
      setSelectedSupporterId((current) => current ?? supportersData[0]?.id ?? null);
      setSelectedDonationId((current) => current ?? donationsData[0]?.id ?? null);
      setDonationForm((current) => current.allocations[0].safehouseId > 0 ? current : createDonationForm(safehouseData[0]?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donor data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  const selectedSupporter = supporters.find((supporter) => supporter.id === selectedSupporterId) ?? supporters[0] ?? null;
  const selectedDonation = donations.find((donation) => donation.id === selectedDonationId) ?? donations[0] ?? null;

  const normalizedSearch = normalizeText(deferredSearch);
  const filteredSupporters = supporters.filter((supporter) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(supporter.displayName).includes(normalizedSearch) ||
      normalizeText(supporter.email).includes(normalizedSearch) ||
      normalizeText(supporter.supporterType).includes(normalizedSearch);
    const matchesStatus = statusFilter === 'All' || supporter.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDonations = donations.filter((donation) => {
    if (!normalizedSearch) return true;
    return (
      normalizeText(donation.supporterName).includes(normalizedSearch) ||
      normalizeText(donation.campaignName ?? '').includes(normalizedSearch) ||
      normalizeText(donation.channelSource).includes(normalizedSearch) ||
      normalizeText(donation.donationType).includes(normalizedSearch)
    );
  });

  const totalRaised = donations.reduce((sum, donation) => sum + (donation.amount ?? donation.estimatedValue), 0);
  const recurringDonations = donations.filter((donation) => donation.isRecurring).length;
  const activeSupporters = supporters.filter((supporter) => supporter.status === 'Active').length;

  const supporterOptions = useMemo(
    () => supporters.map((supporter) => ({ value: supporter.id, label: `${supporter.displayName} (${supporter.email})` })),
    [supporters],
  );

  if (!token) return null;

  const resetSupporterForm = () => {
    setEditingSupporterId(null);
    setSupporterForm(defaultSupporterForm);
  };

  const resetDonationForm = () => {
    setEditingDonationId(null);
    setDonationForm(createDonationForm(safehouses[0]?.id));
  };

  const handleSupporterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting('supporter');
    setFeedback(null);

    try {
      const payload = {
        ...supporterForm,
        organizationName: supporterForm.organizationName || null,
        firstName: supporterForm.firstName || null,
        lastName: supporterForm.lastName || null,
        phone: supporterForm.phone || null,
        firstDonationDate: supporterForm.firstDonationDate || null,
      };

      if (editingSupporterId) {
        await api.updateSupporter(token, editingSupporterId, payload);
        setFeedback({ tone: 'success', message: 'Supporter updated.' });
      } else {
        await api.createSupporter(token, payload);
        setFeedback({ tone: 'success', message: 'Supporter created.' });
      }

      resetSupporterForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Supporter save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleDonationSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting('donation');
    setFeedback(null);

    try {
      if (editingDonationId) {
        await api.updateDonation(token, editingDonationId, donationForm);
        setFeedback({ tone: 'success', message: 'Donation updated.' });
      } else {
        await api.createDonation(token, donationForm);
        setFeedback({ tone: 'success', message: 'Donation created.' });
      }

      resetDonationForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Donation save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const deleteSupporter = async (id: number) => {
    if (!token || !window.confirm('Delete this supporter? This action requires confirmation.')) return;
    try {
      await api.deleteSupporter(token, id);
      setFeedback({ tone: 'success', message: 'Supporter deleted.' });
      if (selectedSupporterId === id) setSelectedSupporterId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Supporter delete failed.' });
    }
  };

  const deleteDonation = async (id: number) => {
    if (!token || !window.confirm('Delete this donation? This action requires confirmation.')) return;
    try {
      await api.deleteDonation(token, id);
      setFeedback({ tone: 'success', message: 'Donation deleted.' });
      if (selectedDonationId === id) setSelectedDonationId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Donation delete failed.' });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Fundraising operations</span>
          <h1>Donors & contributions</h1>
          <p>Manage supporters, contribution entries, and the primary safehouse allocation from one screen.</p>
        </div>
      </div>

      <section className="page-grid three">
        <MetricCard label="Supporters" value={String(supporters.length)} detail="Directory records loaded for the team." accent />
        <MetricCard label="Active supporters" value={String(activeSupporters)} detail="Current active donor and partner relationships." />
        <MetricCard label="Raised" value={formatMoney(totalRaised)} detail={`${recurringDonations} recurring gifts in the dataset.`} />
      </section>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {loading ? (
        <LoadingState label="Loading donor operations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          <section className="page-grid two dashboard-split">
            <SectionCard
              title="Supporters"
              subtitle={isAdmin ? 'Admins can create, update, and delete supporter records.' : 'Staff can review supporter records but cannot change them.'}
              actions={
                <div className="filter-row">
                  <input
                    aria-label="Search supporters"
                    className="inline-search"
                    placeholder="Search supporters..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <select className="inline-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              }
            >
              {filteredSupporters.length === 0 ? (
                <EmptyState title="No matching supporters" message="Try a different search or status filter." />
              ) : (
                <DataTable
                  caption="Supporter records"
                  columns={['Name', 'Type', 'Status', 'Email', 'Actions']}
                  rows={filteredSupporters.map((supporter) => [
                    <button className="table-link-button" key={`name-${supporter.id}`} onClick={() => setSelectedSupporterId(supporter.id)} type="button">
                      {supporter.displayName}
                    </button>,
                    supporter.supporterType,
                    supporter.status,
                    supporter.email,
                    <div className="table-actions" key={`actions-${supporter.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedSupporterId(supporter.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingSupporterId(supporter.id);
                              setSupporterForm({
                                supporterType: supporter.supporterType,
                                displayName: supporter.displayName,
                                organizationName: supporter.organizationName ?? '',
                                firstName: supporter.firstName ?? '',
                                lastName: supporter.lastName ?? '',
                                relationshipType: supporter.relationshipType,
                                region: supporter.region,
                                country: supporter.country,
                                email: supporter.email,
                                phone: supporter.phone ?? '',
                                status: supporter.status,
                                firstDonationDate: supporter.firstDonationDate ?? '',
                                acquisitionChannel: supporter.acquisitionChannel,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteSupporter(supporter.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                />
              )}
            </SectionCard>

            <DetailPanel title={selectedSupporter?.displayName ?? 'Supporter details'} subtitle="Use the table actions to inspect or edit a specific record.">
              {selectedSupporter ? (
                <DetailList
                  items={[
                    { label: 'Type', value: selectedSupporter.supporterType },
                    { label: 'Email', value: selectedSupporter.email },
                    { label: 'Region', value: `${selectedSupporter.region}, ${selectedSupporter.country}` },
                    { label: 'Status', value: selectedSupporter.status },
                    { label: 'Donations', value: `${selectedSupporter.donationCount} records` },
                    { label: 'Lifetime giving', value: formatMoney(selectedSupporter.lifetimeGiving) },
                  ]}
                />
              ) : (
                <EmptyState title="No supporter selected" message="Choose a supporter from the table to inspect the full record." />
              )}
            </DetailPanel>
          </section>

          {isAdmin ? (
            <SectionCard
              title={editingSupporterId ? 'Edit supporter' : 'Create supporter'}
              subtitle="This starter form keeps the shape simple so your team can extend it without learning a form library first."
              actions={editingSupporterId ? <button className="ghost-button" onClick={resetSupporterForm} type="button">Cancel edit</button> : null}
            >
              <form className="stack-form" onSubmit={handleSupporterSubmit}>
                <FormGrid>
                  <label><span>Display name</span><input value={supporterForm.displayName} onChange={(e) => setSupporterForm({ ...supporterForm, displayName: e.target.value })} required /></label>
                  <label><span>Email</span><input type="email" value={supporterForm.email} onChange={(e) => setSupporterForm({ ...supporterForm, email: e.target.value })} required /></label>
                  <label><span>Supporter type</span><input value={supporterForm.supporterType} onChange={(e) => setSupporterForm({ ...supporterForm, supporterType: e.target.value })} required /></label>
                  <label><span>Status</span><input value={supporterForm.status} onChange={(e) => setSupporterForm({ ...supporterForm, status: e.target.value })} required /></label>
                  <label><span>Relationship type</span><input value={supporterForm.relationshipType} onChange={(e) => setSupporterForm({ ...supporterForm, relationshipType: e.target.value })} required /></label>
                  <label><span>Acquisition channel</span><input value={supporterForm.acquisitionChannel} onChange={(e) => setSupporterForm({ ...supporterForm, acquisitionChannel: e.target.value })} required /></label>
                  <label><span>First name</span><input value={supporterForm.firstName ?? ''} onChange={(e) => setSupporterForm({ ...supporterForm, firstName: e.target.value })} /></label>
                  <label><span>Last name</span><input value={supporterForm.lastName ?? ''} onChange={(e) => setSupporterForm({ ...supporterForm, lastName: e.target.value })} /></label>
                  <label><span>Organization</span><input value={supporterForm.organizationName ?? ''} onChange={(e) => setSupporterForm({ ...supporterForm, organizationName: e.target.value })} /></label>
                  <label><span>Phone</span><input value={supporterForm.phone ?? ''} onChange={(e) => setSupporterForm({ ...supporterForm, phone: e.target.value })} /></label>
                  <label><span>Region</span><input value={supporterForm.region} onChange={(e) => setSupporterForm({ ...supporterForm, region: e.target.value })} required /></label>
                  <label><span>Country</span><input value={supporterForm.country} onChange={(e) => setSupporterForm({ ...supporterForm, country: e.target.value })} required /></label>
                </FormGrid>
                <div className="form-actions">
                  <button className="primary-button" disabled={submitting === 'supporter'} type="submit">
                    {submitting === 'supporter' ? 'Saving...' : editingSupporterId ? 'Update supporter' : 'Create supporter'}
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <section className="page-grid two dashboard-split">
            <SectionCard title="Donations" subtitle="Each row includes the main allocation your team can expand later.">
              {filteredDonations.length === 0 ? (
                <EmptyState title="No matching donations" message="Try a different search term." />
              ) : (
                <DataTable
                  caption="Donation records"
                  columns={['Date', 'Supporter', 'Amount', 'Allocation', 'Actions']}
                  rows={filteredDonations.map((donation) => [
                    formatDate(donation.donationDate),
                    donation.supporterName,
                    formatMoney(donation.amount ?? donation.estimatedValue),
                    donation.allocations[0] ? `${donation.allocations[0].safehouseName} - ${donation.allocations[0].programArea}` : 'No allocation',
                    <div className="table-actions" key={`donation-actions-${donation.id}`}>
                      <button className="ghost-button" onClick={() => setSelectedDonationId(donation.id)} type="button">View</button>
                      {isAdmin ? (
                        <>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              setEditingDonationId(donation.id);
                              setDonationForm({
                                supporterId: donation.supporterId,
                                donationType: donation.donationType,
                                donationDate: donation.donationDate,
                                channelSource: donation.channelSource,
                                currencyCode: donation.currencyCode ?? '',
                                amount: donation.amount,
                                estimatedValue: donation.estimatedValue,
                                impactUnit: donation.impactUnit,
                                isRecurring: donation.isRecurring,
                                campaignName: donation.campaignName ?? '',
                                notes: donation.notes ?? '',
                                allocations: donation.allocations.length > 0
                                  ? donation.allocations.map((allocation) => ({
                                      safehouseId: allocation.safehouseId,
                                      programArea: allocation.programArea,
                                      amountAllocated: allocation.amountAllocated,
                                      allocationDate: allocation.allocationDate,
                                      allocationNotes: allocation.allocationNotes ?? '',
                                    }))
                                  : createDonationForm(safehouses[0]?.id).allocations,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button className="ghost-button danger-button" onClick={() => void deleteDonation(donation.id)} type="button">Delete</button>
                        </>
                      ) : null}
                    </div>,
                  ])}
                />
              )}
            </SectionCard>

            <DetailPanel title={selectedDonation ? `${selectedDonation.supporterName} donation` : 'Donation details'} subtitle="Select a donation row to inspect the full contribution.">
              {selectedDonation ? (
                <DetailList
                  items={[
                    { label: 'Date', value: formatDate(selectedDonation.donationDate) },
                    { label: 'Type', value: selectedDonation.donationType },
                    { label: 'Amount', value: formatMoney(selectedDonation.amount ?? selectedDonation.estimatedValue) },
                    { label: 'Campaign', value: selectedDonation.campaignName ?? 'Direct support' },
                    { label: 'Channel', value: selectedDonation.channelSource },
                    { label: 'Allocation', value: selectedDonation.allocations.map((allocation) => `${allocation.safehouseName} (${allocation.programArea})`).join(', ') || 'No allocation' },
                  ]}
                />
              ) : (
                <EmptyState title="No donation selected" message="Choose a donation row to inspect the contribution details." />
              )}
            </DetailPanel>
          </section>

          {isAdmin ? (
            <SectionCard
              title={editingDonationId ? 'Edit donation' : 'Create donation'}
              subtitle="The starter UI uses one primary allocation row to keep the form understandable."
              actions={editingDonationId ? <button className="ghost-button" onClick={resetDonationForm} type="button">Cancel edit</button> : null}
            >
              <form className="stack-form" onSubmit={handleDonationSubmit}>
                <FormSection title="Donation details">
                  <FormGrid>
                    <label>
                      <span>Supporter</span>
                      <select value={donationForm.supporterId} onChange={(e) => setDonationForm({ ...donationForm, supporterId: Number(e.target.value) })}>
                        {supporterOptions.map((supporter) => <option key={supporter.value} value={supporter.value}>{supporter.label}</option>)}
                      </select>
                    </label>
                    <label><span>Donation type</span><input value={donationForm.donationType} onChange={(e) => setDonationForm({ ...donationForm, donationType: e.target.value })} required /></label>
                    <label><span>Donation date</span><input type="date" value={donationForm.donationDate} onChange={(e) => setDonationForm({ ...donationForm, donationDate: e.target.value })} required /></label>
                    <label><span>Channel</span><input value={donationForm.channelSource} onChange={(e) => setDonationForm({ ...donationForm, channelSource: e.target.value })} required /></label>
                    <label><span>Currency</span><input value={donationForm.currencyCode ?? ''} onChange={(e) => setDonationForm({ ...donationForm, currencyCode: e.target.value })} /></label>
                    <label><span>Amount</span><input type="number" min="0" step="0.01" value={donationForm.amount ?? ''} onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value ? Number(e.target.value) : null })} /></label>
                    <label><span>Estimated value</span><input type="number" min="0.01" step="0.01" value={donationForm.estimatedValue} onChange={(e) => setDonationForm({ ...donationForm, estimatedValue: Number(e.target.value) })} required /></label>
                    <label><span>Impact unit</span><input value={donationForm.impactUnit} onChange={(e) => setDonationForm({ ...donationForm, impactUnit: e.target.value })} required /></label>
                    <label><span>Campaign</span><input value={donationForm.campaignName ?? ''} onChange={(e) => setDonationForm({ ...donationForm, campaignName: e.target.value })} /></label>
                    <label className="checkbox-field"><input type="checkbox" checked={donationForm.isRecurring} onChange={(e) => setDonationForm({ ...donationForm, isRecurring: e.target.checked })} /><span>Recurring</span></label>
                  </FormGrid>
                </FormSection>

                <FormSection title="Primary allocation">
                  <FormGrid>
                    <label>
                      <span>Safehouse</span>
                      <select
                        value={donationForm.allocations[0]?.safehouseId ?? 0}
                        onChange={(e) => setDonationForm({
                          ...donationForm,
                          allocations: [{ ...donationForm.allocations[0], safehouseId: Number(e.target.value) }],
                        })}
                      >
                        {safehouses.map((safehouse) => <option key={safehouse.id} value={safehouse.id}>{safehouse.name}</option>)}
                      </select>
                    </label>
                    <label><span>Program area</span><input value={donationForm.allocations[0]?.programArea ?? ''} onChange={(e) => setDonationForm({ ...donationForm, allocations: [{ ...donationForm.allocations[0], programArea: e.target.value }] })} required /></label>
                    <label><span>Allocated amount</span><input type="number" min="0.01" step="0.01" value={donationForm.allocations[0]?.amountAllocated ?? 0} onChange={(e) => setDonationForm({ ...donationForm, allocations: [{ ...donationForm.allocations[0], amountAllocated: Number(e.target.value) }] })} required /></label>
                    <label><span>Allocation date</span><input type="date" value={donationForm.allocations[0]?.allocationDate ?? ''} onChange={(e) => setDonationForm({ ...donationForm, allocations: [{ ...donationForm.allocations[0], allocationDate: e.target.value }] })} required /></label>
                  </FormGrid>
                </FormSection>

                <label><span>Notes</span><textarea value={donationForm.notes ?? ''} onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })} rows={3} /></label>
                <div className="form-actions">
                  <button className="primary-button" disabled={submitting === 'donation'} type="submit">
                    {submitting === 'donation' ? 'Saving...' : editingDonationId ? 'Update donation' : 'Create donation'}
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
