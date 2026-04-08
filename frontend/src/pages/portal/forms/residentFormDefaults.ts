import type { ResidentRequest } from '../../../api/types';

export function createResidentForm(safehouseId?: number): ResidentRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    caseControlNumber: '',
    internalCode: '',
    safehouseId: safehouseId ?? 1,
    caseStatus: 'Active',
    dateOfBirth: '2011-01-01',
    placeOfBirth: '',
    religion: '',
    caseCategory: 'Neglected',
    isTrafficked: false,
    isPhysicalAbuseCase: false,
    isSexualAbuseCase: false,
    hasSpecialNeeds: false,
    specialNeedsDiagnosis: '',
    familyIs4Ps: false,
    familySoloParent: false,
    familyIndigenous: false,
    familyInformalSettler: false,
    dateOfAdmission: today,
    referralSource: 'Government Agency',
    referringAgencyPerson: '',
    assignedSocialWorker: '',
    initialCaseAssessment: '',
    reintegrationType: '',
    reintegrationStatus: '',
    initialRiskLevel: 'Medium',
    currentRiskLevel: 'Medium',
    dateClosed: '',
    restrictedNotes: '',
    interventionPlans: [
      {
        planCategory: 'Psychosocial',
        planDescription: '',
        servicesProvided: '',
        targetValue: null,
        targetDate: today,
        status: 'Open',
        caseConferenceDate: '',
      },
    ],
  };
}
