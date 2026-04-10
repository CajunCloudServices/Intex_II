import type { FormEvent } from 'react';
import type { ResidentRequest, Safehouse } from '../../../api/types';
import {
  CheckboxField,
  FormGrid,
  FormSection,
  ValidatedSelectField,
  ValidatedTextField,
  ValidatedTextareaField,
} from '../../../components/ui/FormPrimitives';
import type { ValidationErrors } from '../../../lib/validation';

type ResidentRecordFormProps = {
  residentForm: ResidentRequest;
  setResidentForm: React.Dispatch<React.SetStateAction<ResidentRequest>>;
  residentErrors: ValidationErrors;
  safehouses: Safehouse[];
  socialWorkerOptions?: string[];
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
  caseControlNumberReadOnly?: boolean;
  internalCodeReadOnly?: boolean;
};

const CASE_STATUS_OPTIONS = ['Active', 'Closed', 'Transferred'];
const SEX_OPTIONS = [
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
];
const BIRTH_STATUS_OPTIONS = ['Marital', 'Non-Marital', 'Unknown'];
const CASE_CATEGORY_OPTIONS = [
  'Neglected',
  'Surrendered',
  'Foundling',
  'Abandoned',
  'Trafficking',
  'PhysicalAbuse',
  'SexualAbuse',
  'Abandonment',
  'FamilyConflict',
  'Other',
];
const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const REFERRAL_SOURCE_OPTIONS = ['Government Agency', 'NGO', 'Court Order', 'Police', 'Community', 'Self-Referral', 'Other'];
const REINTEGRATION_TYPE_OPTIONS = ['', 'Family Reunification', 'Foster Care', 'Independent Living', 'Adoption (Domestic)', 'Adoption (Inter-Country)', 'None', 'Other'];
const REINTEGRATION_STATUS_OPTIONS = ['', 'Not Started', 'In Progress', 'On Hold', 'Completed'];
const INTERVENTION_STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Deferred', label: 'Deferred' },
  { value: 'Closed', label: 'Closed' },
];
const PLAN_CATEGORY_OPTIONS = ['Psychosocial', 'Health', 'Education', 'Legal', 'Family', 'Reintegration'];
const PWD_TYPE_OPTIONS = ['', 'Hearing', 'Intellectual', 'Learning Disability', 'Mobility', 'Speech', 'Visual', 'Other'];

export function ResidentRecordForm({
  residentForm,
  setResidentForm,
  residentErrors,
  safehouses,
  socialWorkerOptions = [],
  onSubmit,
  submitting,
  submitLabel,
  caseControlNumberReadOnly = false,
  internalCodeReadOnly = false,
}: ResidentRecordFormProps) {
  const firstPlan = residentForm.interventionPlans[0];
  const workerOptions =
    socialWorkerOptions.includes(residentForm.assignedSocialWorker) || !residentForm.assignedSocialWorker
      ? socialWorkerOptions
      : [residentForm.assignedSocialWorker, ...socialWorkerOptions];

  const updatePlan = (field: keyof NonNullable<ResidentRequest['interventionPlans'][number]>, value: string | number | null) => {
    setResidentForm({
      ...residentForm,
      interventionPlans: [
        {
          ...firstPlan,
          [field]: value,
        },
      ],
    });
  };

  return (
    <form className="stack-form" onSubmit={onSubmit} noValidate>
      <FormSection title="Core case information">
        <FormGrid>
          <ValidatedTextField
            label="Case control number"
            required
            hint={caseControlNumberReadOnly ? 'Automatically generated to avoid duplicate case numbers.' : 'Use letters, numbers, and dashes.'}
            value={residentForm.caseControlNumber}
            onChange={(e) => setResidentForm({ ...residentForm, caseControlNumber: e.target.value })}
            error={residentErrors.caseControlNumber}
            readOnly={caseControlNumberReadOnly}
          />
          <ValidatedTextField
            label="Internal code"
            required
            hint={internalCodeReadOnly ? 'Automatically generated from the intake year and next available sequence.' : 'Internal short code, example: LS-0001.'}
            value={residentForm.internalCode}
            onChange={(e) => setResidentForm({ ...residentForm, internalCode: e.target.value })}
            error={residentErrors.internalCode}
            readOnly={internalCodeReadOnly}
          />
          <ValidatedSelectField
            label="Safehouse"
            required
            value={residentForm.safehouseId}
            onChange={(e) => setResidentForm({ ...residentForm, safehouseId: Number(e.target.value) })}
            error={residentErrors.safehouseId}
          >
            {safehouses.map((safehouse) => (
              <option key={safehouse.id} value={safehouse.id}>
                {safehouse.name}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Case status"
            required
            value={residentForm.caseStatus}
            onChange={(e) => setResidentForm({ ...residentForm, caseStatus: e.target.value })}
            error={residentErrors.caseStatus}
          >
            {CASE_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Sex"
            required
            value={residentForm.sex}
            onChange={(e) => setResidentForm({ ...residentForm, sex: e.target.value })}
            error={residentErrors.sex}
          >
            {SEX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Date of birth"
            type="date"
            required
            value={residentForm.dateOfBirth}
            onChange={(e) => setResidentForm({ ...residentForm, dateOfBirth: e.target.value })}
            error={residentErrors.dateOfBirth}
          />
          <ValidatedSelectField
            label="Birth status"
            required
            value={residentForm.birthStatus}
            onChange={(e) => setResidentForm({ ...residentForm, birthStatus: e.target.value })}
            error={residentErrors.birthStatus}
          >
            {BIRTH_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Place of birth"
            required
            value={residentForm.placeOfBirth}
            onChange={(e) => setResidentForm({ ...residentForm, placeOfBirth: e.target.value })}
            error={residentErrors.placeOfBirth}
          />
          <ValidatedTextField
            label="Religion"
            required
            value={residentForm.religion}
            onChange={(e) => setResidentForm({ ...residentForm, religion: e.target.value })}
            error={residentErrors.religion}
          />
          <ValidatedSelectField
            label="Case category"
            required
            value={residentForm.caseCategory}
            onChange={(e) => setResidentForm({ ...residentForm, caseCategory: e.target.value })}
            error={residentErrors.caseCategory}
          >
            {CASE_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Date of admission"
            type="date"
            required
            value={residentForm.dateOfAdmission}
            onChange={(e) => setResidentForm({ ...residentForm, dateOfAdmission: e.target.value })}
            error={residentErrors.dateOfAdmission}
          />
          <ValidatedTextField
            label="Date enrolled"
            type="date"
            value={residentForm.dateEnrolled ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, dateEnrolled: e.target.value })}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Case classification and sub-categories">
        <div className="check-grid">
          <CheckboxField label="Orphaned" checked={residentForm.subCatOrphaned} onChange={(checked) => setResidentForm({ ...residentForm, subCatOrphaned: checked })} />
          <CheckboxField label="Trafficked" checked={residentForm.isTrafficked} onChange={(checked) => setResidentForm({ ...residentForm, isTrafficked: checked })} />
          <CheckboxField label="Child labor" checked={residentForm.subCatChildLabor} onChange={(checked) => setResidentForm({ ...residentForm, subCatChildLabor: checked })} />
          <CheckboxField label="Physical abuse case" checked={residentForm.isPhysicalAbuseCase} onChange={(checked) => setResidentForm({ ...residentForm, isPhysicalAbuseCase: checked })} />
          <CheckboxField label="Sexual abuse case" checked={residentForm.isSexualAbuseCase} onChange={(checked) => setResidentForm({ ...residentForm, isSexualAbuseCase: checked })} />
          <CheckboxField label="OSAEC" checked={residentForm.subCatOsaec} onChange={(checked) => setResidentForm({ ...residentForm, subCatOsaec: checked })} />
          <CheckboxField label="CICL" checked={residentForm.subCatCicl} onChange={(checked) => setResidentForm({ ...residentForm, subCatCicl: checked })} />
          <CheckboxField label="At risk" checked={residentForm.subCatAtRisk} onChange={(checked) => setResidentForm({ ...residentForm, subCatAtRisk: checked })} />
          <CheckboxField label="Street child" checked={residentForm.subCatStreetChild} onChange={(checked) => setResidentForm({ ...residentForm, subCatStreetChild: checked })} />
          <CheckboxField label="Child with HIV" checked={residentForm.subCatChildWithHiv} onChange={(checked) => setResidentForm({ ...residentForm, subCatChildWithHiv: checked })} />
        </div>
      </FormSection>

      <FormSection title="Disability and family socio-demographic profile">
        <FormGrid>
          <ValidatedSelectField
            label="PWD type"
            value={residentForm.pwdType ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, pwdType: e.target.value })}
            error={residentErrors.pwdType}
            hint="Required when PWD is selected."
          >
            {PWD_TYPE_OPTIONS.map((option) => (
              <option key={option || 'blank'} value={option}>
                {option || 'Select PWD type'}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Special needs diagnosis"
            value={residentForm.specialNeedsDiagnosis ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, specialNeedsDiagnosis: e.target.value })}
            error={residentErrors.specialNeedsDiagnosis}
            hint="Required when special needs is selected."
          />
        </FormGrid>
        <div className="check-grid">
          <CheckboxField label="PWD" checked={residentForm.isPwd} onChange={(checked) => setResidentForm({ ...residentForm, isPwd: checked })} />
          <CheckboxField label="Special needs" checked={residentForm.hasSpecialNeeds} onChange={(checked) => setResidentForm({ ...residentForm, hasSpecialNeeds: checked })} />
          <CheckboxField label="Family is 4Ps" checked={residentForm.familyIs4Ps} onChange={(checked) => setResidentForm({ ...residentForm, familyIs4Ps: checked })} />
          <CheckboxField label="Solo parent family" checked={residentForm.familySoloParent} onChange={(checked) => setResidentForm({ ...residentForm, familySoloParent: checked })} />
          <CheckboxField label="Indigenous family" checked={residentForm.familyIndigenous} onChange={(checked) => setResidentForm({ ...residentForm, familyIndigenous: checked })} />
          <CheckboxField label="Parent with disability" checked={residentForm.familyParentPwd} onChange={(checked) => setResidentForm({ ...residentForm, familyParentPwd: checked })} />
          <CheckboxField label="Informal settler family" checked={residentForm.familyInformalSettler} onChange={(checked) => setResidentForm({ ...residentForm, familyInformalSettler: checked })} />
        </div>
      </FormSection>

      <FormSection title="Admission, referral, and assigned worker">
        <FormGrid>
          <ValidatedSelectField
            label="Referral source"
            required
            value={residentForm.referralSource}
            onChange={(e) => setResidentForm({ ...residentForm, referralSource: e.target.value })}
            error={residentErrors.referralSource}
          >
            {REFERRAL_SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Referring person"
            value={residentForm.referringAgencyPerson ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, referringAgencyPerson: e.target.value })}
          />
          <ValidatedTextField
            label="COLB registered"
            type="date"
            value={residentForm.dateColbRegistered ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, dateColbRegistered: e.target.value })}
          />
          <ValidatedTextField
            label="COLB obtained"
            type="date"
            value={residentForm.dateColbObtained ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, dateColbObtained: e.target.value })}
          />
          <ValidatedTextField
            label="Assigned social worker"
            required
            list="worker-suggestions"
            value={residentForm.assignedSocialWorker}
            onChange={(e) => setResidentForm({ ...residentForm, assignedSocialWorker: e.target.value })}
            error={residentErrors.assignedSocialWorker}
            placeholder="Enter social worker name"
          />
          <ValidatedTextField
            label="Case study prepared"
            type="date"
            value={residentForm.dateCaseStudyPrepared ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, dateCaseStudyPrepared: e.target.value })}
          />
        </FormGrid>
        {workerOptions.length > 0 ? (
          <datalist id="worker-suggestions">
            {workerOptions.map((worker) => (
              <option key={worker} value={worker} />
            ))}
          </datalist>
        ) : null}
      </FormSection>

      <FormSection title="Risk and reintegration">
        <FormGrid>
          <ValidatedSelectField
            label="Initial risk"
            required
            value={residentForm.initialRiskLevel}
            onChange={(e) => setResidentForm({ ...residentForm, initialRiskLevel: e.target.value })}
            error={residentErrors.initialRiskLevel}
          >
            {RISK_LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Current risk"
            required
            value={residentForm.currentRiskLevel}
            onChange={(e) => setResidentForm({ ...residentForm, currentRiskLevel: e.target.value })}
            error={residentErrors.currentRiskLevel}
          >
            {RISK_LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Reintegration type"
            value={residentForm.reintegrationType ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, reintegrationType: e.target.value })}
          >
            {REINTEGRATION_TYPE_OPTIONS.map((option) => (
              <option key={option || 'blank'} value={option}>
                {option || 'Not set'}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Reintegration status"
            value={residentForm.reintegrationStatus ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, reintegrationStatus: e.target.value })}
          >
            {REINTEGRATION_STATUS_OPTIONS.map((option) => (
              <option key={option || 'blank'} value={option}>
                {option || 'Not set'}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Date closed"
            type="date"
            value={residentForm.dateClosed ?? ''}
            onChange={(e) => setResidentForm({ ...residentForm, dateClosed: e.target.value })}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Current intervention plan">
        <FormGrid>
          <ValidatedSelectField
            label="Plan category"
            required
            value={firstPlan?.planCategory ?? ''}
            onChange={(e) => updatePlan('planCategory', e.target.value)}
            error={residentErrors.planCategory}
          >
            {PLAN_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Plan status"
            required
            value={firstPlan?.status ?? ''}
            onChange={(e) => updatePlan('status', e.target.value)}
            error={residentErrors.planStatus}
          >
            {INTERVENTION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Target date"
            type="date"
            required
            value={firstPlan?.targetDate ?? ''}
            onChange={(e) => updatePlan('targetDate', e.target.value)}
            error={residentErrors.planTargetDate}
          />
          <ValidatedTextField
            label="Case conference date"
            type="date"
            value={firstPlan?.caseConferenceDate ?? ''}
            onChange={(e) => updatePlan('caseConferenceDate', e.target.value)}
            error={residentErrors.caseConferenceDate}
          />
          <ValidatedTextField
            label="Services provided"
            required
            value={firstPlan?.servicesProvided ?? ''}
            onChange={(e) => updatePlan('servicesProvided', e.target.value)}
            error={residentErrors.servicesProvided}
          />
          <ValidatedTextField
            label="Target value"
            type="number"
            min="0"
            step="0.01"
            value={firstPlan?.targetValue ?? ''}
            onChange={(e) => updatePlan('targetValue', e.target.value ? Number(e.target.value) : null)}
          />
        </FormGrid>
        <ValidatedTextareaField
          label="Plan description"
          required
          rows={3}
          value={firstPlan?.planDescription ?? ''}
          onChange={(e) => updatePlan('planDescription', e.target.value)}
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
