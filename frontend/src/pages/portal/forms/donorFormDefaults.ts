import type { Donation, DonationRequest, Supporter, SupporterRequest } from '../../../api/types';

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
    supporterId: 0,
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
        safehouseId: safehouseId ?? 0,
        programArea: 'Wellbeing',
        amountAllocated: 100,
        allocationDate: today,
        allocationNotes: '',
      },
    ],
  };
}

export function createSupporterFormFromRecord(supporter: Supporter): SupporterRequest {
  return {
    supporterType: supporter.supporterType,
    displayName: supporter.displayName,
    organizationName: supporter.organizationName ?? '',
    firstName: supporter.firstName ?? '',
    lastName: supporter.lastName ?? '',
    relationshipType: supporter.relationshipType,
    region: supporter.region,
    country: supporter.country,
    email: supporter.email,
    phone: supporter.phone ?? '',
    status: supporter.status,
    firstDonationDate: supporter.firstDonationDate ?? '',
    acquisitionChannel: supporter.acquisitionChannel,
  };
}

export function createDonationFormFromRecord(donation: Donation, fallbackSafehouseId?: number): DonationRequest {
  return {
    supporterId: donation.supporterId,
    donationType: donation.donationType,
    donationDate: donation.donationDate,
    channelSource: donation.channelSource,
    currencyCode: donation.currencyCode ?? '',
    amount: donation.amount,
    estimatedValue: donation.estimatedValue,
    impactUnit: donation.impactUnit,
    isRecurring: donation.isRecurring,
    campaignName: donation.campaignName ?? '',
    notes: donation.notes ?? '',
    allocations:
      donation.allocations.length > 0
        ? donation.allocations.map((allocation) => ({
            safehouseId: allocation.safehouseId,
            programArea: allocation.programArea,
            amountAllocated: allocation.amountAllocated,
            allocationDate: allocation.allocationDate,
            allocationNotes: allocation.allocationNotes ?? '',
          }))
        : createDonationForm(fallbackSafehouseId).allocations,
  };
}
