export type Role = 'Admin' | 'Staff' | 'Donor';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  supporterId?: number | null;
}

export interface AuditEvent {
  id: number;
  actionType: string;
  entityType: string;
  entityId: number;
  actorUserId?: string | null;
  actorEmail: string;
  createdAtUtc: string;
  summary: string;
}

/** Cookie session is issued by the server; no bearer token is returned. */
export interface AuthResponse {
  user: UserProfile;
}

export interface AuthProvidersResponse {
  googleEnabled: boolean;
}

export interface PublicImpactSnapshot {
  id: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  totalResidents?: number | null;
  avgHealthScore?: number | null;
  avgEducationProgress?: number | null;
  donationsTotalForMonth?: number | null;
  homeVisitsThisMonth: number;
  isDisplayValid: boolean;
}

export interface PublicImpactResourceUseItem {
  programArea: string;
  amountAllocated: number;
  sharePercent: number;
}

export interface PublicImpactCapacityRow {
  safehouseName: string;
  currentOccupancy: number;
  capacityGirls: number;
}

export interface PublicImpactSummary {
  totalOccupancy: number;
  totalCapacity: number;
  safehouseCount: number;
  homeVisitsThisMonth: number;
  homeVisitsReportingMonth?: string | null;
}

export interface PublicImpactDashboard {
  snapshots: PublicImpactSnapshot[];
  resourceUse: PublicImpactResourceUseItem[];
  capacityRows: PublicImpactCapacityRow[];
  summary: PublicImpactSummary;
}

export interface DashboardSummary {
  activeResidents: number;
  safehouseCount: number;
  donationsThisMonth: number;
  openInterventionPlans: number;
  homeVisitsThisMonth: number;
  socialPostsThisMonth: number;
  highRiskResidents: number;
  visitsNeedingFollowUp: number;
  openIncidents: number;
  recentDonations: {
    donationId: number;
    supporterName: string;
    amount: number;
    donationDate: string;
    donationType: string;
  }[];
  upcomingCaseConferences: UpcomingCaseConference[];
  progressSummary: {
    progressNoted: number;
    concernsFlagged: number;
    referralsMade: number;
  };
  safehouseUtilization: {
    safehouseName: string;
    currentOccupancy: number;
    capacityGirls: number;
  }[];
}

export interface UpcomingCaseConference {
  id: number;
  residentId: number;
  residentCode: string;
  conferenceDate: string;
  leadWorker: string;
  status: string;
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

export interface DonorImpactSummary {
  totalDonated: number;
  donationCount: number;
  recurringDonationCount: number;
  averageDonationAmount: number;
}

export interface DonorAllocationBreakdownItem {
  safehouseId: number;
  safehouseName: string;
  programArea: string;
  totalAllocated: number;
  allocationCount: number;
  sharePercent: number;
}

export interface DonorAllocationBreakdown {
  totalAllocated: number;
  items: DonorAllocationBreakdownItem[];
}

export interface DonationImpactPredictionOutcome {
  programArea: string;
  allocatedAmount: number;
  outcomeUnit: string;
  unitCost: number;
  estimatedUnits: number;
}

export interface DonationImpactPrediction {
  amount: number;
  outcomes: DonationImpactPredictionOutcome[];
  assumptions: string;
  estimatedVictimsImpacted: number;
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

export interface CaseConference {
  id: number;
  residentId: number;
  residentCode: string;
  conferenceDate: string;
  leadWorker: string;
  attendees: string;
  purpose: string;
  decisionsMade: string;
  followUpActions: string;
  nextReviewDate?: string | null;
  status: string;
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

export interface DonationTrendPoint {
  periodLabel: string;
  totalAmount: number;
  donationCount: number;
}

export interface ContributionMix {
  donationType: string;
  totalAmount: number;
  donationCount: number;
}

export interface CampaignSummary {
  campaignName: string;
  totalAmount: number;
  donationCount: number;
}

export interface ChannelSummary {
  channelSource: string;
  totalAmount: number;
  donationCount: number;
}

export interface DonationTrends {
  monthlyTotals: DonationTrendPoint[];
  recurringDonationCount: number;
  oneTimeDonationCount: number;
  contributionMix: ContributionMix[];
  campaignSummaries: CampaignSummary[];
  channelSummaries: ChannelSummary[];
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface ResidentOutcomeSummary {
  interventionPlanStatuses: BreakdownItem[];
  riskDistribution: BreakdownItem[];
  followUpBurden: {
    visitsNeedingFollowUp: number;
    openIncidents: number;
    highRiskResidents: number;
  };
  processRecordingSummary: {
    progressNoted: number;
    concernsFlagged: number;
    referralsMade: number;
  };
  reintegrationStatuses: BreakdownItem[];
}

export interface SafehouseMonthlyTrendPoint {
  monthStart: string;
  activeResidents: number;
  avgEducationProgress: number;
  avgHealthScore: number;
  processRecordingCount: number;
  homeVisitationCount: number;
  incidentCount: number;
}

export interface SafehouseTrendRow {
  safehouseId: number;
  safehouseName: string;
  monthlyTrend: SafehouseMonthlyTrendPoint[];
}

export interface SafehousePerformanceSummary {
  safehouses: {
    safehouseId: number;
    safehouseName: string;
    currentOccupancy: number;
    capacityGirls: number;
    residentCount: number;
    incidentCount: number;
    donationAllocationTotal: number;
  }[];
  monthlyTrends: SafehouseTrendRow[];
}

export interface ReintegrationSummary {
  reintegrationStatuses: BreakdownItem[];
  reintegrationTypes: BreakdownItem[];
  residentsClosed: number;
  residentsActive: number;
}

export interface OutreachPerformanceSummary {
  platformSummaries: {
    platform: string;
    averageEngagementRate: number;
    totalDonationReferrals: number;
    estimatedDonationValuePhp: number;
  }[];
  recentPosts: {
    platform: string;
    postType: string;
    engagementRate: number;
    donationReferrals: number;
    estimatedDonationValuePhp: number;
  }[];
}

export interface SocialPostDetail {
  id: number;
  platform: string;
  postType: string;
  caption?: string | null;
  createdAtUtc: string;
  campaignName?: string | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clickThroughs: number;
  engagementRate: number;
  donationReferrals: number;
  estimatedDonationValuePhp: number;
  isBoosted: boolean;
}

export interface SocialAnalyticsTotals {
  totalPosts: number;
  totalImpressions: number;
  totalReach: number;
  totalDonationReferrals: number;
  totalEstimatedValuePhp: number;
  avgEngagementRate: number;
}

export interface SocialAnalytics {
  totals: SocialAnalyticsTotals;
  platformSummaries: {
    platform: string;
    averageEngagementRate: number;
    totalDonationReferrals: number;
    estimatedDonationValuePhp: number;
  }[];
  posts: SocialPostDetail[];
  page: number;
  pageSize: number;
  totalPosts: number;
}

export interface SocialPostAdvisorRequest {
  platform: string;
  postType: string;
  mediaType: string;
  sentimentTone: string;
  postHour: number;
  numHashtags: number;
  hasCallToAction: boolean;
  featuresResidentStory: boolean;
  isBoosted: boolean;
  boostBudgetPhp: number;
}

export interface SocialPostAdvisorContribution {
  feature: string;
  effectAmountPhp: number;
}

export interface SocialPostAdvisorPrediction {
  predictedDonationValuePhp: number;
  baselineDonationValuePhp: number;
  topContributions: SocialPostAdvisorContribution[];
  notes: string;
}

export interface DonorChurnRiskRow {
  supporterId: number;
  displayName: string;
  churnProbability: number;
  riskTier: string;
  lastDonationDate?: string | null;
  lifetimeDonationAmount: number;
  donationCount: number;
  daysSinceLastDonation: number;
  recommendedAction: string;
}

export interface DonorChurnRiskSummary {
  evaluatedSupporters: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  topRisks: DonorChurnRiskRow[];
}

export interface CounselingRiskRow {
  recordingId: number;
  residentId: number;
  residentCode: string;
  sessionDate: string;
  sessionType: string;
  concernProbability: number;
  riskTier: string;
  primaryFactor: string;
}

export interface CounselingRiskSummary {
  evaluatedSessions: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  topRiskSessions: CounselingRiskRow[];
}

export interface ReintegrationRiskRow {
  residentId: number;
  residentCode: string;
  riskScore: number;
  positiveProbability: number;
  recommendedAction: string;
  topRiskFactors: string[];
}

export interface ReintegrationRiskSummary {
  evaluatedResidents: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  topRiskResidents: ReintegrationRiskRow[];
}

export interface TrendDeploymentRow {
  pipelineKey: string;
  businessQuestion: string;
  endpointPath: string;
  uiSurface: string;
  primaryMetric: string;
  currentValue: number;
  recommendation: string;
}

export interface TrendDeploymentSummary {
  generatedAtUtc: string;
  rows: TrendDeploymentRow[];
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

export interface PublicDonationSubmissionRequest {
  donorName: string;
  donorEmail: string;
  amount: number;
  isRecurring: boolean;
  recurringInterval?: string | null;
  notes?: string | null;
}

export interface PublicDonationSubmissionResponse {
  donationId: number;
  supporterId: number;
  supporterName: string;
  amount: number;
  isRecurring: boolean;
  recurringInterval?: string | null;
  message: string;
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

export interface CaseConferenceRequest {
  residentId: number;
  conferenceDate: string;
  leadWorker: string;
  attendees: string;
  purpose: string;
  decisionsMade: string;
  followUpActions: string;
  nextReviewDate?: string | null;
  status: string;
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
