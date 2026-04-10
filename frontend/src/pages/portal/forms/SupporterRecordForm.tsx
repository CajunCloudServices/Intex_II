import type { FormEvent } from 'react';
import type { SupporterRequest } from '../../../api/types';
import { FormGrid, ValidatedSelectField, ValidatedTextField } from '../../../components/ui/FormPrimitives';
import type { ValidationErrors } from '../../../lib/validation';

const baseSupporterTypeOptions = [
  'MonetaryDonor',
  'InKindDonor',
  'Volunteer',
  'SkillsContributor',
  'SocialMediaAdvocate',
  'PartnerOrganization',
  'CorporatePartner',
  'Foundation',
  'Advocate',
  'CommunityPartner',
];

const supporterStatusOptions = ['Active', 'Inactive'];
const baseAcquisitionChannelOptions = [
  'Website',
  'SocialMedia',
  'Event',
  'WordOfMouth',
  'PartnerReferral',
  'Church',
  'Referral',
  'Campaign',
  'Direct',
];

type SupporterRecordFormProps = {
  supporterForm: SupporterRequest;
  setSupporterForm: React.Dispatch<React.SetStateAction<SupporterRequest>>;
  supporterErrors: ValidationErrors;
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
  submitting: boolean;
  submitLabel: string;
};

export function SupporterRecordForm({
  supporterForm,
  setSupporterForm,
  supporterErrors,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: SupporterRecordFormProps) {
  const supporterTypeOptions = buildOptions(baseSupporterTypeOptions, supporterForm.supporterType);
  const acquisitionChannelOptions = buildOptions(baseAcquisitionChannelOptions, supporterForm.acquisitionChannel);

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormGrid>
        <ValidatedTextField
          label="Display name"
          required
          hint="How this supporter appears in lists and reports."
          value={supporterForm.displayName}
          onChange={(e) => setSupporterForm({ ...supporterForm, displayName: e.target.value })}
          error={supporterErrors.displayName}
        />
        <ValidatedTextField
          label="Email"
          required
          type="email"
          hint="Format: name@example.org"
          value={supporterForm.email}
          onChange={(e) => setSupporterForm({ ...supporterForm, email: e.target.value })}
          error={supporterErrors.email}
        />
        <ValidatedSelectField
          label="Supporter type"
          required
          value={supporterForm.supporterType}
          onChange={(e) => setSupporterForm({ ...supporterForm, supporterType: e.target.value })}
          error={supporterErrors.supporterType}
        >
          {supporterTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </ValidatedSelectField>
        <ValidatedSelectField
          label="Status"
          required
          value={supporterForm.status}
          onChange={(e) => setSupporterForm({ ...supporterForm, status: e.target.value })}
          error={supporterErrors.status}
        >
          {supporterStatusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </ValidatedSelectField>
        <ValidatedTextField
          label="Relationship type"
          required
          value={supporterForm.relationshipType}
          onChange={(e) => setSupporterForm({ ...supporterForm, relationshipType: e.target.value })}
          error={supporterErrors.relationshipType}
        />
        <ValidatedTextField
          label="First donation date"
          type="date"
          hint="Optional. Keep this aligned with the first recorded gift when known."
          value={supporterForm.firstDonationDate ?? ''}
          onChange={(e) => setSupporterForm({ ...supporterForm, firstDonationDate: e.target.value })}
        />
        <ValidatedSelectField
          label="Acquisition channel"
          required
          value={supporterForm.acquisitionChannel}
          onChange={(e) => setSupporterForm({ ...supporterForm, acquisitionChannel: e.target.value })}
          error={supporterErrors.acquisitionChannel}
        >
          {acquisitionChannelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </ValidatedSelectField>
        <ValidatedTextField label="First name" value={supporterForm.firstName ?? ''} onChange={(e) => setSupporterForm({ ...supporterForm, firstName: e.target.value })} />
        <ValidatedTextField label="Last name" value={supporterForm.lastName ?? ''} onChange={(e) => setSupporterForm({ ...supporterForm, lastName: e.target.value })} />
        <ValidatedTextField
          label="Organization"
          value={supporterForm.organizationName ?? ''}
          onChange={(e) => setSupporterForm({ ...supporterForm, organizationName: e.target.value })}
        />
        <ValidatedTextField
          label="Phone"
          hint="Optional: include country code if available."
          value={supporterForm.phone ?? ''}
          onChange={(e) => setSupporterForm({ ...supporterForm, phone: e.target.value })}
          error={supporterErrors.phone}
        />
        <ValidatedTextField label="Region" required value={supporterForm.region} onChange={(e) => setSupporterForm({ ...supporterForm, region: e.target.value })} error={supporterErrors.region} />
        <ValidatedTextField label="Country" required value={supporterForm.country} onChange={(e) => setSupporterForm({ ...supporterForm, country: e.target.value })} error={supporterErrors.country} />
      </FormGrid>
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

function buildOptions(options: string[], currentValue: string) {
  const values = new Set(options);
  if (currentValue.trim()) {
    values.add(currentValue);
  }

  return [...values];
}
