export type Role = 'Admin' | 'Staff' | 'Donor';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  supporterId?: number | null;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: UserProfile;
}

export interface PublicImpactMetric {
  label: string;
  value: string;
}

export interface PublicImpactSnapshot {
  id: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  metrics: PublicImpactMetric[];
}

export interface DashboardSummary {
  activeResidents: number;
  safehouseCount: number;
  donationsThisMonth: number;
  openInterventionPlans: number;
  homeVisitsThisMonth: number;
  socialPostsThisMonth: number;
  recentDonations: {
    donationId: number;
    supporterName: string;
    amount: number;
    donationDate: string;
    donationType: string;
  }[];
  safehouseUtilization: {
    safehouseName: string;
    currentOccupancy: number;
    capacityGirls: number;
  }[];
}

export interface Supporter {
  id: number;
  supporterType: string;
  displayName: string;
  organizationName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  relationshipType: string;
  region: string;
  country: string;
  email: string;
  phone?: string | null;
  status: string;
  firstDonationDate?: string | null;
  acquisitionChannel: string;
  createdAtUtc: string;
  donationCount: number;
  lifetimeGiving: number;
}

export interface DonationAllocation {
  id: number;
  safehouseId: number;
  safehouseName: string;
  programArea: string;
  amountAllocated: number;
  allocationDate: string;
  allocationNotes?: string | null;
}

export interface Donation {
  id: number;
  supporterId: number;
  supporterName: string;
  donationType: string;
  donationDate: string;
  channelSource: string;
  currencyCode?: string | null;
  amount?: number | null;
  estimatedValue: number;
  impactUnit: string;
  isRecurring: boolean;
  campaignName?: string | null;
  notes?: string | null;
  allocations: DonationAllocation[];
}

export interface ResidentPlan {
  id: number;
  planCategory: string;
  planDescription: string;
  servicesProvided: string;
  targetValue?: number | null;
  targetDate: string;
  status: string;
  caseConferenceDate?: string | null;
}

export interface Resident {
  id: number;
  caseControlNumber: string;
  internalCode: string;
  safehouseId: number;
  safehouseName: string;
  caseStatus: string;
  dateOfBirth: string;
  placeOfBirth: string;
  religion: string;
  caseCategory: string;
  isTrafficked: boolean;
  isPhysicalAbuseCase: boolean;
  isSexualAbuseCase: boolean;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis?: string | null;
  familyIs4Ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  referralSource: string;
  referringAgencyPerson?: string | null;
  assignedSocialWorker: string;
  initialCaseAssessment: string;
  reintegrationType?: string | null;
  reintegrationStatus?: string | null;
  initialRiskLevel: string;
  currentRiskLevel: string;
  dateClosed?: string | null;
  restrictedNotes?: string | null;
  interventionPlans: ResidentPlan[];
}

export interface ProcessRecording {
  id: number;
  residentId: number;
  residentCode: string;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  restrictedNotes?: string | null;
}

export interface HomeVisitation {
  id: number;
  residentId: number;
  residentCode: string;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes?: string | null;
  visitOutcome: string;
}

export interface Safehouse {
  id: number;
  code: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  openDate: string;
  status: string;
  capacityGirls: number;
  capacityStaff: number;
  currentOccupancy: number;
  notes?: string | null;
  residentCount: number;
  incidentCount: number;
}

export interface IncidentReport {
  id: number;
  residentId: number;
  residentCode: string;
  safehouseId: number;
  safehouseName: string;
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  responseTaken: string;
  resolved: boolean;
  resolutionDate?: string | null;
  reportedBy: string;
  followUpRequired: boolean;
}

export interface SupporterRequest {
  supporterType: string;
  displayName: string;
  organizationName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  relationshipType: string;
  region: string;
  country: string;
  email: string;
  phone?: string | null;
  status: string;
  firstDonationDate?: string | null;
  acquisitionChannel: string;
}

export interface DonationRequest {
  supporterId: number;
  donationType: string;
  donationDate: string;
  channelSource: string;
  currencyCode?: string | null;
  amount?: number | null;
  estimatedValue: number;
  impactUnit: string;
  isRecurring: boolean;
  campaignName?: string | null;
  notes?: string | null;
  allocations: {
    safehouseId: number;
    programArea: string;
    amountAllocated: number;
    allocationDate: string;
    allocationNotes?: string | null;
  }[];
}

export interface ResidentRequest {
  caseControlNumber: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  dateOfBirth: string;
  placeOfBirth: string;
  religion: string;
  caseCategory: string;
  isTrafficked: boolean;
  isPhysicalAbuseCase: boolean;
  isSexualAbuseCase: boolean;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis?: string | null;
  familyIs4Ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  referralSource: string;
  referringAgencyPerson?: string | null;
  assignedSocialWorker: string;
  initialCaseAssessment: string;
  reintegrationType?: string | null;
  reintegrationStatus?: string | null;
  initialRiskLevel: string;
  currentRiskLevel: string;
  dateClosed?: string | null;
  restrictedNotes?: string | null;
  interventionPlans: {
    planCategory: string;
    planDescription: string;
    servicesProvided: string;
    targetValue?: number | null;
    targetDate: string;
    status: string;
    caseConferenceDate?: string | null;
  }[];
}

export interface ProcessRecordingRequest {
  residentId: number;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  restrictedNotes?: string | null;
}

export interface HomeVisitationRequest {
  residentId: number;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes?: string | null;
  visitOutcome: string;
}

export interface SafehouseRequest {
  code: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  openDate: string;
  status: string;
  capacityGirls: number;
  capacityStaff: number;
  currentOccupancy: number;
  notes?: string | null;
}

export interface IncidentReportRequest {
  residentId: number;
  safehouseId: number;
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  responseTaken: string;
  resolved: boolean;
  resolutionDate?: string | null;
  reportedBy: string;
  followUpRequired: boolean;
}
