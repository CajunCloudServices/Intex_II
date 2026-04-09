import type { ResidentRequest } from '../../../api/types';
import {
  validateDateNotFuture,
  validateDateRequired,
  validateRequired,
  withError,
  type ValidationErrors,
} from '../../../lib/validation';

export function validateResidentForm(form: ResidentRequest): ValidationErrors {
  const firstPlan = form.interventionPlans[0];
  let errors: ValidationErrors = {};
  errors = withError(errors, 'caseControlNumber', validateRequired(form.caseControlNumber, 'Case control number'));
  errors = withError(errors, 'internalCode', validateRequired(form.internalCode, 'Internal code'));
  errors = withError(errors, 'caseStatus', validateRequired(form.caseStatus, 'Case status'));
  errors = withError(errors, 'sex', validateRequired(form.sex, 'Sex'));
  errors = withError(errors, 'birthStatus', validateRequired(form.birthStatus, 'Birth status'));
  errors = withError(errors, 'caseCategory', validateRequired(form.caseCategory, 'Case category'));
  errors = withError(errors, 'dateOfBirth', validateDateNotFuture(form.dateOfBirth, 'Date of birth'));
  errors = withError(errors, 'dateOfAdmission', validateDateRequired(form.dateOfAdmission, 'Date of admission'));
  errors = withError(errors, 'placeOfBirth', validateRequired(form.placeOfBirth, 'Place of birth'));
  errors = withError(errors, 'religion', validateRequired(form.religion, 'Religion'));
  errors = withError(errors, 'referralSource', validateRequired(form.referralSource, 'Referral source'));
  errors = withError(errors, 'assignedSocialWorker', validateRequired(form.assignedSocialWorker, 'Assigned social worker'));
  errors = withError(errors, 'initialCaseAssessment', validateRequired(form.initialCaseAssessment, 'Initial case assessment'));
  errors = withError(errors, 'initialRiskLevel', validateRequired(form.initialRiskLevel, 'Initial risk level'));
  errors = withError(errors, 'currentRiskLevel', validateRequired(form.currentRiskLevel, 'Current risk level'));
  if (form.isPwd) {
    errors = withError(errors, 'pwdType', validateRequired(form.pwdType ?? '', 'PWD type'));
  }
  if (form.hasSpecialNeeds) {
    errors = withError(errors, 'specialNeedsDiagnosis', validateRequired(form.specialNeedsDiagnosis ?? '', 'Special needs diagnosis'));
  }
  errors = withError(errors, 'planCategory', validateRequired(firstPlan?.planCategory ?? '', 'Plan category'));
  errors = withError(errors, 'planStatus', validateRequired(firstPlan?.status ?? '', 'Plan status'));
  errors = withError(errors, 'planTargetDate', validateDateRequired(firstPlan?.targetDate ?? '', 'Plan target date'));
  errors = withError(errors, 'servicesProvided', validateRequired(firstPlan?.servicesProvided ?? '', 'Services provided'));
  errors = withError(errors, 'planDescription', validateRequired(firstPlan?.planDescription ?? '', 'Plan description'));
  return errors;
}
