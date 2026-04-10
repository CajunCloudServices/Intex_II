import type { FormEvent } from 'react';
import type { DonationRequest, Safehouse } from '../../../api/types';
import { FormGrid, FormSection, ValidatedSelectField, ValidatedTextField, ValidatedTextareaField } from '../../../components/ui/FormPrimitives';
import type { ValidationErrors } from '../../../lib/validation';

type Option = { value: number; label: string };

type DonationRecordFormProps = {
  donationForm: DonationRequest;
  setDonationForm: React.Dispatch<React.SetStateAction<DonationRequest>>;
  donationErrors: ValidationErrors;
  supporterOptions: Option[];
  safehouses: Safehouse[];
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
  submitting: boolean;
  submitLabel: string;
};

export function DonationRecordForm({
  donationForm,
  setDonationForm,
  donationErrors,
  supporterOptions,
  safehouses,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: DonationRecordFormProps) {
  const donationTypeOptions = ['Monetary', 'InKind', 'Time', 'Skills', 'SocialMedia'];
  const channelOptions = ['Direct', 'Website', 'Campaign', 'SocialMedia', 'Event'];

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormSection title="Donation details">
        <FormGrid>
          <ValidatedSelectField
            label="Supporter"
            required
            error={donationErrors.supporterId}
            value={donationForm.supporterId}
            onChange={(e) => setDonationForm({ ...donationForm, supporterId: Number(e.target.value) })}
          >
            {supporterOptions.map((supporter) => (
              <option key={supporter.value} value={supporter.value}>
                {supporter.label}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Donation type"
            required
            value={donationForm.donationType}
            onChange={(e) => setDonationForm({ ...donationForm, donationType: e.target.value })}
            error={donationErrors.donationType}
          >
            <option value="" disabled>
              Select donation type
            </option>
            {donationTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Donation date"
            required
            type="date"
            value={donationForm.donationDate}
            onChange={(e) => setDonationForm({ ...donationForm, donationDate: e.target.value })}
            error={donationErrors.donationDate}
          />
          <ValidatedSelectField
            label="Channel"
            required
            value={donationForm.channelSource}
            onChange={(e) => setDonationForm({ ...donationForm, channelSource: e.target.value })}
            error={donationErrors.channelSource}
          >
            <option value="" disabled>
              Select channel
            </option>
            {channelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Currency"
            hint="3-letter ISO code, ex: USD or PHP."
            value={donationForm.currencyCode ?? ''}
            onChange={(e) => setDonationForm({ ...donationForm, currencyCode: e.target.value })}
            error={donationErrors.currencyCode}
          />
          <ValidatedTextField
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            hint="Optional when estimated value is used."
            value={donationForm.amount ?? ''}
            onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value ? Number(e.target.value) : null })}
            error={donationErrors.amount}
          />
          <ValidatedTextField
            label="Estimated value"
            required
            type="number"
            min="0.01"
            step="0.01"
            hint="Currency amount greater than 0."
            value={donationForm.estimatedValue}
            onChange={(e) => setDonationForm({ ...donationForm, estimatedValue: Number(e.target.value) })}
            error={donationErrors.estimatedValue}
          />
          <ValidatedTextField
            label="Impact unit"
            required
            hint="Example: pesos, meals, kits, sessions."
            value={donationForm.impactUnit}
            onChange={(e) => setDonationForm({ ...donationForm, impactUnit: e.target.value })}
            error={donationErrors.impactUnit}
          />
          <ValidatedTextField label="Campaign" value={donationForm.campaignName ?? ''} onChange={(e) => setDonationForm({ ...donationForm, campaignName: e.target.value })} />
          <label className="checkbox-field checkbox-field-toggle">
            <span className="checkbox-toggle-copy">Recurring</span>
            <input type="checkbox" checked={donationForm.isRecurring} onChange={(e) => setDonationForm({ ...donationForm, isRecurring: e.target.checked })} />
            <span aria-hidden="true" className="checkbox-toggle-ui" />
          </label>
        </FormGrid>
      </FormSection>

      <FormSection title="Primary allocation">
        <FormGrid>
          <ValidatedSelectField
            label="Safehouse"
            value={donationForm.allocations[0]?.safehouseId ?? 0}
            onChange={(e) =>
              setDonationForm({
                ...donationForm,
                allocations: [{ ...donationForm.allocations[0], safehouseId: Number(e.target.value) }],
              })
            }
            error={donationErrors.safehouseId}
          >
            {safehouses.map((safehouse) => (
              <option key={safehouse.id} value={safehouse.id}>
                {safehouse.name}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Program area"
            required
            value={donationForm.allocations[0]?.programArea ?? ''}
            onChange={(e) => setDonationForm({ ...donationForm, allocations: [{ ...donationForm.allocations[0], programArea: e.target.value }] })}
            error={donationErrors.programArea}
          />
          <ValidatedTextField
            label="Allocated amount"
            required
            type="number"
            min="0.01"
            step="0.01"
            value={donationForm.allocations[0]?.amountAllocated ?? 0}
            onChange={(e) => setDonationForm({ ...donationForm, allocations: [{ ...donationForm.allocations[0], amountAllocated: Number(e.target.value) }] })}
            error={donationErrors.amountAllocated}
          />
          <ValidatedTextField
            label="Allocation date"
            required
            type="date"
            value={donationForm.allocations[0]?.allocationDate ?? ''}
            onChange={(e) => setDonationForm({ ...donationForm, allocations: [{ ...donationForm.allocations[0], allocationDate: e.target.value }] })}
            error={donationErrors.allocationDate}
          />
        </FormGrid>
      </FormSection>

      <ValidatedTextareaField
        label="Notes"
        rows={3}
        hint="Optional operational details for the contribution record."
        value={donationForm.notes ?? ''}
        onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })}
      />
      <div className="form-actions">
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
