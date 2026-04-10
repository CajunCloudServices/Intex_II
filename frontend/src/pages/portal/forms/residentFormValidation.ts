import { compactFieldErrors, extractApiFieldErrors } from '../../../lib/apiErrors';
import type { ResidentRequest } from '../../../api/types';
import {
  validateCaseCode,
  validateDateNotBefore,
  validateDateNotFuture,
  validateDateRequired,
  validateRequired,
  validateRequiredSelection,
  withError,
  type ValidationErrors,
} from '../../../lib/validation';

export function validateResidentForm(form: ResidentRequest): ValidationErrors {
  const firstPlan = form.interventionPlans[0];
  let errors: ValidationErrors = {};
  errors = withError(errors, 'caseControlNumber', validateCaseCode(form.caseControlNumber, 'Case control number'));
  errors = withError(errors, 'internalCode', validateCaseCode(form.internalCode, 'Internal code'));
  errors = withError(errors, 'safehouseId', validateRequiredSelection(form.safehouseId, 'Safehouse'));
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
  errors = withError(errors, 'dateOfAdmission', validateDateNotBefore(form.dateOfAdmission, form.dateOfBirth, 'Date of admission', 'date of birth'));
  errors = withError(errors, 'dateColbObtained', validateDateNotBefore(form.dateColbObtained ?? '', form.dateColbRegistered ?? '', 'Date COLB obtained', 'date COLB registered'));
  errors = withError(errors, 'dateCaseStudyPrepared', validateDateNotBefore(form.dateCaseStudyPrepared ?? '', form.dateOfAdmission, 'Case study date', 'date of admission'));
  errors = withError(errors, 'dateEnrolled', validateDateNotBefore(form.dateEnrolled ?? '', form.dateOfAdmission, 'Enrollment date', 'date of admission'));
  errors = withError(errors, 'dateClosed', validateDateNotBefore(form.dateClosed ?? '', form.dateOfAdmission, 'Date closed', 'date of admission'));
  if (form.isPwd) {
    errors = withError(errors, 'pwdType', validateRequired(form.pwdType ?? '', 'PWD type'));
  }
  if (form.hasSpecialNeeds) {
    errors = withError(errors, 'specialNeedsDiagnosis', validateRequired(form.specialNeedsDiagnosis ?? '', 'Special needs diagnosis'));
  }
  errors = withError(errors, 'planCategory', validateRequired(firstPlan?.planCategory ?? '', 'Plan category'));
  errors = withError(errors, 'planStatus', validateRequired(firstPlan?.status ?? '', 'Plan status'));
  errors = withError(errors, 'planTargetDate', validateDateRequired(firstPlan?.targetDate ?? '', 'Plan target date'));
  errors = withError(errors, 'caseConferenceDate', validateDateNotBefore(firstPlan?.targetDate ?? '', firstPlan?.caseConferenceDate ?? '', 'Plan target date', 'case conference date'));
  errors = withError(errors, 'servicesProvided', validateRequired(firstPlan?.servicesProvided ?? '', 'Services provided'));
  errors = withError(errors, 'planDescription', validateRequired(firstPlan?.planDescription ?? '', 'Plan description'));
  return errors;
}

export function extractResidentFieldErrors(error: unknown): ValidationErrors {
  const apiErrors = extractApiFieldErrors(error);
  const getFirstError = (...keys: string[]) => {
    for (const key of keys) {
      const match = apiErrors[key];
      if (match?.[0]) {
        return match[0];
      }
    }

    return undefined;
  };

  return compactFieldErrors<ValidationErrors>({
    caseControlNumber: getFirstError('CaseControlNumber', 'caseControlNumber'),
    internalCode: getFirstError('InternalCode', 'internalCode'),
    safehouseId: getFirstError('SafehouseId', 'safehouseId'),
    caseStatus: getFirstError('CaseStatus', 'caseStatus'),
    sex: getFirstError('Sex', 'sex'),
    dateOfBirth: getFirstError('DateOfBirth', 'dateOfBirth'),
    birthStatus: getFirstError('BirthStatus', 'birthStatus'),
    placeOfBirth: getFirstError('PlaceOfBirth', 'placeOfBirth'),
    religion: getFirstError('Religion', 'religion'),
    caseCategory: getFirstError('CaseCategory', 'caseCategory'),
    pwdType: getFirstError('PwdType', 'pwdType'),
    specialNeedsDiagnosis: getFirstError('SpecialNeedsDiagnosis', 'specialNeedsDiagnosis'),
    dateOfAdmission: getFirstError('DateOfAdmission', 'dateOfAdmission'),
    referralSource: getFirstError('ReferralSource', 'referralSource'),
    referringAgencyPerson: getFirstError('ReferringAgencyPerson', 'referringAgencyPerson'),
    dateColbRegistered: getFirstError('DateColbRegistered', 'dateColbRegistered'),
    dateColbObtained: getFirstError('DateColbObtained', 'dateColbObtained'),
    assignedSocialWorker: getFirstError('AssignedSocialWorker', 'assignedSocialWorker'),
    initialCaseAssessment: getFirstError('InitialCaseAssessment', 'initialCaseAssessment'),
    dateCaseStudyPrepared: getFirstError('DateCaseStudyPrepared', 'dateCaseStudyPrepared'),
    initialRiskLevel: getFirstError('InitialRiskLevel', 'initialRiskLevel'),
    currentRiskLevel: getFirstError('CurrentRiskLevel', 'currentRiskLevel'),
    reintegrationType: getFirstError('ReintegrationType', 'reintegrationType'),
    reintegrationStatus: getFirstError('ReintegrationStatus', 'reintegrationStatus'),
    dateEnrolled: getFirstError('DateEnrolled', 'dateEnrolled'),
    dateClosed: getFirstError('DateClosed', 'dateClosed'),
    planCategory: getFirstError('InterventionPlans[0].PlanCategory', 'PlanCategory'),
    planStatus: getFirstError('InterventionPlans[0].Status', 'Status'),
    planTargetDate: getFirstError('InterventionPlans[0].TargetDate', 'TargetDate'),
    caseConferenceDate: getFirstError('InterventionPlans[0].CaseConferenceDate', 'CaseConferenceDate'),
    servicesProvided: getFirstError('InterventionPlans[0].ServicesProvided', 'ServicesProvided'),
    planDescription: getFirstError('InterventionPlans[0].PlanDescription', 'PlanDescription'),
  });
}
