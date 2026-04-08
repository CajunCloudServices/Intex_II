import type { FormEvent } from 'react';
import type { ResidentRequest, Safehouse } from '../../../api/types';
import { CheckboxField, FormGrid, FormSection, ValidatedSelectField, ValidatedTextField, ValidatedTextareaField } from '../../../components/ui/FormPrimitives';
import type { ValidationErrors } from '../../../lib/validation';

type ResidentRecordFormProps = {
  residentForm: ResidentRequest;
  setResidentForm: React.Dispatch<React.SetStateAction<ResidentRequest>>;
  residentErrors: ValidationErrors;
  safehouses: Safehouse[];
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
};

export function ResidentRecordForm({
  residentForm,
  setResidentForm,
  residentErrors,
  safehouses,
  onSubmit,
  submitting,
  submitLabel,
}: ResidentRecordFormProps) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormSection title="Core case information">
        <FormGrid>
          <ValidatedTextField
            label="Case control number"
            required
            hint="Use letters, numbers, and dashes."
            value={residentForm.caseControlNumber}
            onChange={(e) => setResidentForm({ ...residentForm, caseControlNumber: e.target.value })}
            error={residentErrors.caseControlNumber}
          />
          <ValidatedTextField
            label="Internal code"
            required
            hint="Internal short code, ex: RBAC-001."
            value={residentForm.internalCode}
            onChange={(e) => setResidentForm({ ...residentForm, internalCode: e.target.value })}
            error={residentErrors.internalCode}
          />
          <ValidatedSelectField label="Safehouse" value={residentForm.safehouseId} onChange={(e) => setResidentForm({ ...residentForm, safehouseId: Number(e.target.value) })}>
            {safehouses.map((safehouse) => (
              <option key={safehouse.id} value={safehouse.id}>
                {safehouse.name}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Case status"
            required
            hint="Examples: Active, Closed, Transferred."
            value={residentForm.caseStatus}
            onChange={(e) => setResidentForm({ ...residentForm, caseStatus: e.target.value })}
            error={residentErrors.caseStatus}
          />
          <ValidatedTextField label="Date of birth" type="date" required value={residentForm.dateOfBirth} onChange={(e) => setResidentForm({ ...residentForm, dateOfBirth: e.target.value })} error={residentErrors.dateOfBirth} />
          <ValidatedTextField
            label="Date of admission"
            type="date"
            required
            value={residentForm.dateOfAdmission}
            onChange={(e) => setResidentForm({ ...residentForm, dateOfAdmission: e.target.value })}
            error={residentErrors.dateOfAdmission}
          />
          <ValidatedTextField label="Place of birth" required value={residentForm.placeOfBirth} onChange={(e) => setResidentForm({ ...residentForm, placeOfBirth: e.target.value })} error={residentErrors.placeOfBirth} />
          <ValidatedTextField label="Religion" required value={residentForm.religion} onChange={(e) => setResidentForm({ ...residentForm, religion: e.target.value })} error={residentErrors.religion} />
          <ValidatedTextField
            label="Case category"
            required
            hint="Example: Neglected or Trafficking."
            value={residentForm.caseCategory}
            onChange={(e) => setResidentForm({ ...residentForm, caseCategory: e.target.value })}
            error={residentErrors.caseCategory}
          />
          <ValidatedTextField
            label="Referral source"
            required
            value={residentForm.referralSource}
            onChange={(e) => setResidentForm({ ...residentForm, referralSource: e.target.value })}
            error={residentErrors.referralSource}
          />
          <ValidatedTextField
            label="Assigned social worker"
            required
            value={residentForm.assignedSocialWorker}
            onChange={(e) => setResidentForm({ ...residentForm, assignedSocialWorker: e.target.value })}
            error={residentErrors.assignedSocialWorker}
          />
          <ValidatedTextField label="Referring person" value={residentForm.referringAgencyPerson ?? ''} onChange={(e) => setResidentForm({ ...residentForm, referringAgencyPerson: e.target.value })} />
        </FormGrid>
      </FormSection>

      <FormSection title="Risk and flags">
        <FormGrid>
          <ValidatedTextField
            label="Initial risk"
            required
            hint="Low, Medium, High, or Critical."
            value={residentForm.initialRiskLevel}
            onChange={(e) => setResidentForm({ ...residentForm, initialRiskLevel: e.target.value })}
            error={residentErrors.initialRiskLevel}
          />
          <ValidatedTextField
            label="Current risk"
            required
            hint="Low, Medium, High, or Critical."
            value={residentForm.currentRiskLevel}
            onChange={(e) => setResidentForm({ ...residentForm, currentRiskLevel: e.target.value })}
            error={residentErrors.currentRiskLevel}
          />
          <ValidatedTextField label="Reintegration type" value={residentForm.reintegrationType ?? ''} onChange={(e) => setResidentForm({ ...residentForm, reintegrationType: e.target.value })} />
          <ValidatedTextField label="Reintegration status" value={residentForm.reintegrationStatus ?? ''} onChange={(e) => setResidentForm({ ...residentForm, reintegrationStatus: e.target.value })} />
        </FormGrid>
        <div className="check-grid">
          <CheckboxField label="Trafficked" checked={residentForm.isTrafficked} onChange={(checked) => setResidentForm({ ...residentForm, isTrafficked: checked })} />
          <CheckboxField label="Physical abuse case" checked={residentForm.isPhysicalAbuseCase} onChange={(checked) => setResidentForm({ ...residentForm, isPhysicalAbuseCase: checked })} />
          <CheckboxField label="Sexual abuse case" checked={residentForm.isSexualAbuseCase} onChange={(checked) => setResidentForm({ ...residentForm, isSexualAbuseCase: checked })} />
          <CheckboxField label="Special needs" checked={residentForm.hasSpecialNeeds} onChange={(checked) => setResidentForm({ ...residentForm, hasSpecialNeeds: checked })} />
          <CheckboxField label="Family is 4Ps" checked={residentForm.familyIs4Ps} onChange={(checked) => setResidentForm({ ...residentForm, familyIs4Ps: checked })} />
          <CheckboxField label="Solo parent family" checked={residentForm.familySoloParent} onChange={(checked) => setResidentForm({ ...residentForm, familySoloParent: checked })} />
          <CheckboxField label="Indigenous family" checked={residentForm.familyIndigenous} onChange={(checked) => setResidentForm({ ...residentForm, familyIndigenous: checked })} />
          <CheckboxField label="Informal settler family" checked={residentForm.familyInformalSettler} onChange={(checked) => setResidentForm({ ...residentForm, familyInformalSettler: checked })} />
        </div>
      </FormSection>

      <FormSection title="Starter intervention plan">
        <FormGrid>
          <ValidatedTextField
            label="Plan category"
            required
            value={residentForm.interventionPlans[0]?.planCategory ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], planCategory: e.target.value }] })}
            error={residentErrors.planCategory}
          />
          <ValidatedTextField
            label="Status"
            required
            value={residentForm.interventionPlans[0]?.status ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], status: e.target.value }] })}
            error={residentErrors.planStatus}
          />
          <ValidatedTextField
            label="Target date"
            type="date"
            required
            value={residentForm.interventionPlans[0]?.targetDate ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], targetDate: e.target.value }] })}
            error={residentErrors.planTargetDate}
          />
          <ValidatedTextField
            label="Services provided"
            required
            value={residentForm.interventionPlans[0]?.servicesProvided ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], servicesProvided: e.target.value }] })}
            error={residentErrors.servicesProvided}
          />
        </FormGrid>
        <ValidatedTextareaField
          label="Plan description"
          required
          rows={3}
          value={residentForm.interventionPlans[0]?.planDescription ?? ''}
          onChange={(e) => setResidentForm({ ...residentForm, interventionPlans: [{ ...residentForm.interventionPlans[0], planDescription: e.target.value }] })}
          error={residentErrors.planDescription}
        />
      </FormSection>

      <ValidatedTextareaField
        label="Initial case assessment"
        required
        rows={3}
        value={residentForm.initialCaseAssessment}
        onChange={(e) => setResidentForm({ ...residentForm, initialCaseAssessment: e.target.value })}
        error={residentErrors.initialCaseAssessment}
      />
      <ValidatedTextareaField
        label="Restricted notes"
        rows={3}
        hint="Optional: sensitive notes visible to authorized staff only."
        value={residentForm.restrictedNotes ?? ''}
        onChange={(e) => setResidentForm({ ...residentForm, restrictedNotes: e.target.value })}
      />
      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
