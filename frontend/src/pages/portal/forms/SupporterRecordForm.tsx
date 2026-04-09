import type { FormEvent } from 'react';
import type { SupporterRequest } from '../../../api/types';
import { FormGrid, ValidatedTextField } from '../../../components/ui/FormPrimitives';
import type { ValidationErrors } from '../../../lib/validation';

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
        <ValidatedTextField
          label="Supporter type"
          required
          hint="Examples: MonetaryDonor, CorporatePartner."
          value={supporterForm.supporterType}
          onChange={(e) => setSupporterForm({ ...supporterForm, supporterType: e.target.value })}
          error={supporterErrors.supporterType}
        />
        <ValidatedTextField
          label="Status"
          required
          hint="Active or Inactive."
          value={supporterForm.status}
          onChange={(e) => setSupporterForm({ ...supporterForm, status: e.target.value })}
          error={supporterErrors.status}
        />
        <ValidatedTextField
          label="Relationship type"
          required
          value={supporterForm.relationshipType}
          onChange={(e) => setSupporterForm({ ...supporterForm, relationshipType: e.target.value })}
          error={supporterErrors.relationshipType}
        />
        <ValidatedTextField
          label="Acquisition channel"
          required
          hint="Examples: Website, Referral, Event."
          value={supporterForm.acquisitionChannel}
          onChange={(e) => setSupporterForm({ ...supporterForm, acquisitionChannel: e.target.value })}
          error={supporterErrors.acquisitionChannel}
        />
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
