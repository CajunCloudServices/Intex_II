import type { Resident, ResidentRequest } from '../../../api/types';

export function createResidentForm(safehouseId?: number): ResidentRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    caseControlNumber: '',
    internalCode: '',
    safehouseId: safehouseId ?? 1,
    caseStatus: 'Active',
    sex: 'F',
    dateOfBirth: '2011-01-01',
    birthStatus: 'Marital',
    placeOfBirth: '',
    religion: '',
    caseCategory: 'Neglected',
    subCatOrphaned: false,
    isTrafficked: false,
    subCatChildLabor: false,
    isPhysicalAbuseCase: false,
    isSexualAbuseCase: false,
    subCatOsaec: false,
    subCatCicl: false,
    subCatAtRisk: false,
    subCatStreetChild: false,
    subCatChildWithHiv: false,
    isPwd: false,
    pwdType: '',
    hasSpecialNeeds: false,
    specialNeedsDiagnosis: '',
    familyIs4Ps: false,
    familySoloParent: false,
    familyIndigenous: false,
    familyParentPwd: false,
    familyInformalSettler: false,
    dateOfAdmission: today,
    referralSource: 'Government Agency',
    referringAgencyPerson: '',
    dateColbRegistered: '',
    dateColbObtained: '',
    assignedSocialWorker: '',
    initialCaseAssessment: '',
    dateCaseStudyPrepared: '',
    reintegrationType: '',
    reintegrationStatus: '',
    initialRiskLevel: 'Medium',
    currentRiskLevel: 'Medium',
    dateEnrolled: '',
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

export function generateNextCaseControlNumber(residents: Resident[]): string {
  const maxValue = residents.reduce((currentMax, resident) => {
    const match = /^C(\d+)$/.exec(resident.caseControlNumber.trim());
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);

  return `C${String(maxValue + 1).padStart(4, '0')}`;
}

export function generateNextInternalCode(residents: Resident[], referenceDate?: string): string {
  const year = Number(referenceDate?.slice(0, 4)) || new Date().getFullYear();
  const maxValue = residents.reduce((currentMax, resident) => {
    const match = /^R-(\d{4})-(\d+)$/.exec(resident.internalCode.trim());
    if (!match || Number(match[1]) !== year) {
      return currentMax;
    }

    return Math.max(currentMax, Number(match[2]));
  }, 0);

  return `R-${year}-${String(maxValue + 1).padStart(3, '0')}`;
}
