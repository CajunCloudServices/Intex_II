import type { FormEvent } from 'react';
import type { CaseConferenceRequest } from '../../../api/types';
import { FormGrid, FormSection, ValidatedSelectField, ValidatedTextareaField, ValidatedTextField } from '../../../components/ui/FormPrimitives';
import { conferenceStatusOptions } from './homeVisitationDefaults';

type Option = { value: number; label: string };

export type CaseConferenceFieldErrors = Partial<Record<
  | 'residentId'
  | 'conferenceDate'
  | 'leadWorker'
  | 'status'
  | 'purpose'
  | 'attendees'
  | 'decisionsMade'
  | 'followUpActions',
  string
>>;

type CaseConferenceRecordFormProps = {
  conferenceForm: CaseConferenceRequest;
  setConferenceForm: React.Dispatch<React.SetStateAction<CaseConferenceRequest>>;
  residentOptions: Option[];
  workerOptions: string[];
  fieldErrors?: CaseConferenceFieldErrors;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
};

export function CaseConferenceRecordForm({
  conferenceForm,
  setConferenceForm,
  residentOptions,
  workerOptions,
  fieldErrors,
  onSubmit,
  submitting,
  submitLabel,
}: CaseConferenceRecordFormProps) {
  const availableWorkers = workerOptions.includes(conferenceForm.leadWorker)
    ? workerOptions
    : conferenceForm.leadWorker
      ? [conferenceForm.leadWorker, ...workerOptions]
      : workerOptions;

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormSection title="Conference details">
        <FormGrid>
          <ValidatedSelectField
            label="Resident"
            required
            error={fieldErrors?.residentId}
            value={conferenceForm.residentId}
            onChange={(event) => setConferenceForm({ ...conferenceForm, residentId: Number(event.target.value) })}
          >
              {residentOptions.map((resident) => (
                <option key={resident.value} value={resident.value}>
                  {resident.label}
                </option>
              ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Conference date"
            type="date"
            required
            error={fieldErrors?.conferenceDate}
            value={conferenceForm.conferenceDate}
            onChange={(event) => setConferenceForm({ ...conferenceForm, conferenceDate: event.target.value })}
          />
          <ValidatedSelectField
            label="Lead worker"
            required
            error={fieldErrors?.leadWorker}
            value={conferenceForm.leadWorker}
            onChange={(event) => setConferenceForm({ ...conferenceForm, leadWorker: event.target.value })}
          >
              <option value="">Select a worker</option>
              {availableWorkers.map((worker) => (
                <option key={worker} value={worker}>
                  {worker}
                </option>
              ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Status"
            required
            error={fieldErrors?.status}
            value={conferenceForm.status}
            onChange={(event) => setConferenceForm({ ...conferenceForm, status: event.target.value })}
          >
              {conferenceStatusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Next review date"
            type="date"
            value={conferenceForm.nextReviewDate ?? ''}
            onChange={(event) => setConferenceForm({ ...conferenceForm, nextReviewDate: event.target.value })}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Conference narrative">
        <ValidatedTextareaField
          label="Attendees"
          rows={2}
          error={fieldErrors?.attendees}
          value={conferenceForm.attendees}
          onChange={(event) => setConferenceForm({ ...conferenceForm, attendees: event.target.value })}
        />
        <ValidatedTextareaField
          label="Purpose"
          required
          rows={3}
          error={fieldErrors?.purpose}
          value={conferenceForm.purpose}
          onChange={(event) => setConferenceForm({ ...conferenceForm, purpose: event.target.value })}
        />
        <ValidatedTextareaField
          label="Decisions made"
          required={conferenceForm.status !== 'Scheduled'}
          rows={4}
          error={fieldErrors?.decisionsMade}
          value={conferenceForm.decisionsMade}
          onChange={(event) => setConferenceForm({ ...conferenceForm, decisionsMade: event.target.value })}
        />
        <ValidatedTextareaField
          label="Follow-up actions"
          required={conferenceForm.status !== 'Scheduled'}
          rows={4}
          error={fieldErrors?.followUpActions}
          value={conferenceForm.followUpActions}
          onChange={(event) => setConferenceForm({ ...conferenceForm, followUpActions: event.target.value })}
        />
      </FormSection>

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
