import type { DonationRequest, SupporterRequest } from '../../../api/types';
import {
  validateCurrency,
  validateDateRequired,
  validateEmail,
  validatePhone,
  validateRequired,
  withError,
  type ValidationErrors,
} from '../../../lib/validation';

export function validateSupporterForm(form: SupporterRequest): ValidationErrors {
  let errors: ValidationErrors = {};
  errors = withError(errors, 'displayName', validateRequired(form.displayName, 'Display name'));
  errors = withError(errors, 'email', validateEmail(form.email));
  errors = withError(errors, 'supporterType', validateRequired(form.supporterType, 'Supporter type'));
  errors = withError(errors, 'status', validateRequired(form.status, 'Status'));
  errors = withError(errors, 'relationshipType', validateRequired(form.relationshipType, 'Relationship type'));
  errors = withError(errors, 'acquisitionChannel', validateRequired(form.acquisitionChannel, 'Acquisition channel'));
  errors = withError(errors, 'region', validateRequired(form.region, 'Region'));
  errors = withError(errors, 'country', validateRequired(form.country, 'Country'));
  errors = withError(errors, 'phone', validatePhone(form.phone ?? ''));
  return errors;
}

export function validateDonationForm(form: DonationRequest): ValidationErrors {
  const firstAllocation = form.allocations[0];
  let errors: ValidationErrors = {};
  errors = withError(errors, 'supporterId', form.supporterId > 0 ? null : 'Supporter is required.');
  errors = withError(errors, 'donationType', validateRequired(form.donationType, 'Donation type'));
  errors = withError(errors, 'donationDate', validateDateRequired(form.donationDate, 'Donation date'));
  errors = withError(errors, 'channelSource', validateRequired(form.channelSource, 'Channel'));
  errors = withError(errors, 'estimatedValue', validateCurrency(form.estimatedValue, 'Estimated value'));
  errors = withError(errors, 'impactUnit', validateRequired(form.impactUnit, 'Impact unit'));
  errors = withError(errors, 'programArea', validateRequired(firstAllocation?.programArea ?? '', 'Program area'));
  errors = withError(errors, 'amountAllocated', validateCurrency(firstAllocation?.amountAllocated, 'Allocated amount'));
  errors = withError(errors, 'allocationDate', validateDateRequired(firstAllocation?.allocationDate ?? '', 'Allocation date'));
  return errors;
}
