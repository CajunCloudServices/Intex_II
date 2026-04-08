import type { DonationRequest, SupporterRequest } from '../../../api/types';

export const defaultSupporterForm: SupporterRequest = {
  supporterType: 'MonetaryDonor',
  displayName: '',
  organizationName: '',
  firstName: '',
  lastName: '',
  relationshipType: 'International',
  region: '',
  country: 'Philippines',
  email: '',
  phone: '',
  status: 'Active',
  firstDonationDate: '',
  acquisitionChannel: 'Website',
};

export function createDonationForm(safehouseId?: number): DonationRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    supporterId: 1,
    donationType: 'Monetary',
    donationDate: today,
    channelSource: 'Direct',
    currencyCode: 'USD',
    amount: 100,
    estimatedValue: 100,
    impactUnit: 'pesos',
    isRecurring: false,
    campaignName: '',
    notes: '',
    allocations: [
      {
        safehouseId: safehouseId ?? 1,
        programArea: 'Wellbeing',
        amountAllocated: 100,
        allocationDate: today,
        allocationNotes: '',
      },
    ],
  };
}
