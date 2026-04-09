import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { Donation, DonationRequest, DonorChurnRiskSummary, Safehouse, Supporter, SupporterRequest } from '../../api/types';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { DetailList, DetailPanel } from '../../components/ui/DetailPanel';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';
import { MetricCard, SectionCard } from '../../components/ui/Cards';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/PageState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatMoney, normalizeText } from '../../lib/format';
import { sanitizeOptionalText, sanitizeText, type ValidationErrors } from '../../lib/validation';
import { createDonationForm, defaultSupporterForm } from './forms/donorFormDefaults';
import { DonationRecordForm } from './forms/DonationRecordForm';
import { validateDonationForm, validateSupporterForm } from './forms/donorsFormValidation';
import { SupporterRecordForm } from './forms/SupporterRecordForm';

export function DonorsContributionsPage() {
  const { user } = useAuth();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [churnRiskSummary, setChurnRiskSummary] = useState<DonorChurnRiskSummary | null>(null);
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
  const [supporterErrors, setSupporterErrors] = useState<ValidationErrors>({});
  const [donationErrors, setDonationErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = user?.roles.includes('Admin') ?? false;

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [supportersData, donationsData, safehouseData, churnRiskData] = await Promise.all([
        api.supporters(),
        api.donations(),
        api.safehouses(),
        api.donorChurnRiskSummary(12),
      ]);
      setSupporters(supportersData);
      setDonations(donationsData);
      setSafehouses(safehouseData);
      setChurnRiskSummary(churnRiskData);
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
  }, [user]);

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

  if (!user) return null;

  const resetSupporterForm = () => {
    setEditingSupporterId(null);
    setSupporterErrors({});
    setSupporterForm(defaultSupporterForm);
  };

  const resetDonationForm = () => {
    setEditingDonationId(null);
    setDonationErrors({});
    setDonationForm(createDonationForm(safehouses[0]?.id));
  };

  const handleSupporterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting('supporter');
    setFeedback(null);
    const formErrors = validateSupporterForm(supporterForm);
    setSupporterErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(null);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted supporter fields.' });
      return;
    }

    try {
      if (!editingSupporterId) return;
      const payload = {
        ...supporterForm,
        displayName: sanitizeText(supporterForm.displayName),
        email: sanitizeText(supporterForm.email),
        supporterType: sanitizeText(supporterForm.supporterType),
        status: sanitizeText(supporterForm.status),
        relationshipType: sanitizeText(supporterForm.relationshipType),
        region: sanitizeText(supporterForm.region),
        country: sanitizeText(supporterForm.country),
        acquisitionChannel: sanitizeText(supporterForm.acquisitionChannel),
        organizationName: sanitizeOptionalText(supporterForm.organizationName ?? ''),
        firstName: sanitizeOptionalText(supporterForm.firstName ?? ''),
        lastName: sanitizeOptionalText(supporterForm.lastName ?? ''),
        phone: sanitizeOptionalText(supporterForm.phone ?? ''),
        firstDonationDate: supporterForm.firstDonationDate || null,
      };

      await api.updateSupporter(editingSupporterId, payload);
      setFeedback({ tone: 'success', message: 'Supporter updated.' });

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
    if (!user) return;
    setSubmitting('donation');
    setFeedback(null);
    const formErrors = validateDonationForm(donationForm);
    setDonationErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      setSubmitting(null);
      setFeedback({ tone: 'error', message: 'Please correct the highlighted donation fields.' });
      return;
    }

    try {
      if (!editingDonationId) return;
      const payload = {
        ...donationForm,
        donationType: sanitizeText(donationForm.donationType),
        channelSource: sanitizeText(donationForm.channelSource),
        currencyCode: sanitizeOptionalText(donationForm.currencyCode ?? ''),
        impactUnit: sanitizeText(donationForm.impactUnit),
        campaignName: sanitizeOptionalText(donationForm.campaignName ?? ''),
        notes: sanitizeOptionalText(donationForm.notes ?? ''),
        allocations: donationForm.allocations.map((allocation) => ({
          ...allocation,
          programArea: sanitizeText(allocation.programArea),
          allocationNotes: sanitizeOptionalText(allocation.allocationNotes ?? ''),
        })),
      };
      await api.updateDonation(editingDonationId, payload);
      setFeedback({ tone: 'success', message: 'Donation updated.' });

      resetDonationForm();
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Donation save failed.' });
    } finally {
      setSubmitting(null);
    }
  };

  const deleteSupporter = async (id: number) => {
    if (!user || !window.confirm('Delete this supporter? This action requires confirmation.')) return;
    try {
      await api.deleteSupporter(id);
      setFeedback({ tone: 'success', message: 'Supporter deleted.' });
      if (selectedSupporterId === id) setSelectedSupporterId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Supporter delete failed.' });
    }
  };

  const deleteDonation = async (id: number) => {
    if (!user || !window.confirm('Delete this donation? This action requires confirmation.')) return;
    try {
      await api.deleteDonation(id);
      setFeedback({ tone: 'success', message: 'Donation deleted.' });
      if (selectedDonationId === id) setSelectedDonationId(null);
      await loadData();
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Donation delete failed.' });
    }
  };

  const donorHeaderActions = isAdmin
    ? [
        { label: 'Add Donation', to: '/portal/donors/donations/new' },
        { label: 'Add Supporter', to: '/portal/donors/supporters/new' },
      ]
    : undefined;

  return (
    <div className="page-shell">
      <StaffPortalPageHeader
        eyebrow="Fundraising operations"
        title="Donors & contributions"
        description="Manage supporters, all contribution types, and donation allocations across safehouses and program areas."
        actions={donorHeaderActions}
      />

      <section className="page-grid three">
        <MetricCard label="Supporters" value={String(supporters.length)} detail="Directory records loaded for the team." accent />
        <MetricCard label="Active supporters" value={String(activeSupporters)} detail="Current active donor and partner relationships." />
        <MetricCard label="Raised" value={formatMoney(totalRaised)} detail={`${recurringDonations} recurring gifts in the dataset.`} />
      </section>

      <SectionCard title="At-risk donors (deployed churn scoring)" subtitle="Supporters ranked by current churn probability for retention outreach.">
        <section className="page-grid four compact">
          <MetricCard label="Evaluated" value={String(churnRiskSummary?.evaluatedSupporters ?? 0)} detail="Supporters included in churn scoring run." />
          <MetricCard label="High risk" value={String(churnRiskSummary?.highRiskCount ?? 0)} detail="Prioritize immediate donor outreach." accent />
          <MetricCard label="Medium risk" value={String(churnRiskSummary?.mediumRiskCount ?? 0)} detail="Schedule this month." />
          <MetricCard label="Low risk" value={String(churnRiskSummary?.lowRiskCount ?? 0)} detail="Continue normal stewardship cadence." />
        </section>
        <DataTable
          caption="Top donor churn risks"
          columns={['Supporter', 'Risk', 'Tier', 'Days since donation', 'Action']}
          rows={(churnRiskSummary?.topRisks ?? []).map((risk) => [
            risk.displayName,
            `${(risk.churnProbability * 100).toFixed(1)}%`,
            risk.riskTier,
            risk.daysSinceLastDonation,
            risk.recommendedAction,
          ])}
          emptyMessage="No churn-risk rows available."
        />
      </SectionCard>

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
                    <StatusBadge key={`supporter-status-${supporter.id}`} value={supporter.status} />,
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

            <DetailPanel title={selectedSupporter?.displayName ?? 'Supporter details'} subtitle="Review the supporter profile, relationship status, and overall giving history.">
              {selectedSupporter ? (
                <DetailList
                  items={[
                    { label: 'Type', value: selectedSupporter.supporterType },
                    { label: 'Email', value: selectedSupporter.email },
                    { label: 'Region', value: `${selectedSupporter.region}, ${selectedSupporter.country}` },
                    { label: 'Acquisition channel', value: selectedSupporter.acquisitionChannel },
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

          {isAdmin && editingSupporterId ? (
            <SectionCard
              title="Edit supporter"
              subtitle="Maintain supporter records with a straightforward operational form that matches the current donor workflow."
              actions={
                <button className="ghost-button" onClick={resetSupporterForm} type="button">
                  Cancel edit
                </button>
              }
            >
              <SupporterRecordForm
                supporterForm={supporterForm}
                setSupporterForm={setSupporterForm}
                supporterErrors={supporterErrors}
                onSubmit={handleSupporterSubmit}
                submitting={submitting === 'supporter'}
                submitLabel="Update supporter"
              />
            </SectionCard>
          ) : null}

          <section className="page-grid two dashboard-split">
            <SectionCard title="Donations" subtitle="Review monetary, in-kind, time, skills, and advocacy contributions along with their allocations.">
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

            <DetailPanel title={selectedDonation ? `${selectedDonation.supporterName} donation` : 'Donation details'} subtitle="Inspect the contribution type, campaign context, and how the gift was allocated across the program.">
              {selectedDonation ? (
                <DetailList
                  items={[
                    { label: 'Date', value: formatDate(selectedDonation.donationDate) },
                    { label: 'Type', value: selectedDonation.donationType },
                    { label: 'Amount', value: formatMoney(selectedDonation.amount ?? selectedDonation.estimatedValue) },
                    { label: 'Campaign', value: selectedDonation.campaignName ?? 'Direct support' },
                    { label: 'Channel', value: selectedDonation.channelSource },
                    { label: 'Impact unit', value: selectedDonation.impactUnit },
                    { label: 'Recurring', value: selectedDonation.isRecurring ? 'Yes' : 'No' },
                    { label: 'Allocation', value: selectedDonation.allocations.map((allocation) => `${allocation.safehouseName} (${allocation.programArea}) - ${formatMoney(allocation.amountAllocated)}`).join(', ') || 'No allocation' },
                  ]}
                />
              ) : (
                <EmptyState title="No donation selected" message="Choose a donation row to inspect the contribution details." />
              )}
            </DetailPanel>
          </section>

          {isAdmin && editingDonationId ? (
            <SectionCard
              title="Edit donation"
              subtitle="Capture the full contribution while keeping the primary safehouse allocation visible for review."
              actions={
                <button className="ghost-button" onClick={resetDonationForm} type="button">
                  Cancel edit
                </button>
              }
            >
              <DonationRecordForm
                donationForm={donationForm}
                setDonationForm={setDonationForm}
                donationErrors={donationErrors}
                supporterOptions={supporterOptions}
                safehouses={safehouses}
                onSubmit={handleDonationSubmit}
                submitting={submitting === 'donation'}
                submitLabel="Update donation"
              />
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
