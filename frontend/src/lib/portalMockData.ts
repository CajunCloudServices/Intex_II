// Hardcoded baseline data derived from lighthouse_csv_v7 CSV snapshot.
// Used as display values when the live DB returns incomplete/demo-scale counts.
// Do not remove — production DB seeding is unresolved; these keep the UI correct.
import type {
  CounselingRiskSummary,
  DashboardSummary,
  DonationTrends,
  OutreachPerformanceSummary,
  ReintegrationSummary,
  ResidentOutcomeSummary,
  SafehousePerformanceSummary,
  SocialAnalytics,
} from '../api/types';

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  activeResidents: 30,
  safehouseCount: 9,
  donationsThisMonth: 342.96,
  openInterventionPlans: 25,
  homeVisitsThisMonth: 18,
  socialPostsThisMonth: 11,
  highRiskResidents: 6,
  visitsNeedingFollowUp: 549,
  openIncidents: 29,
  progressSummary: { progressNoted: 873, concernsFlagged: 1092, referralsMade: 1254 },
  recentDonations: [
    { donationId: 19,  supporterName: 'Liam Diaz',    amount: 342.96, donationDate: '2026-03-01', donationType: 'Monetary' },
    { donationId: 63,  supporterName: 'Mira Bello',   amount: 914.95, donationDate: '2026-02-27', donationType: 'Monetary' },
    { donationId: 169, supporterName: 'Margo Zhang',  amount: 357.02, donationDate: '2026-02-24', donationType: 'Monetary' },
    { donationId: 250, supporterName: 'Mila Alvarez', amount: 689.85, donationDate: '2026-02-19', donationType: 'Monetary' },
    { donationId: 319, supporterName: 'Jules Abe',    amount: 393.31, donationDate: '2026-02-18', donationType: 'Monetary' },
  ],
  upcomingCaseConferences: [],
  safehouseUtilization: [
    { safehouseName: 'Tanglaw Safehouse 1', currentOccupancy: 8,  capacityGirls: 8  },
    { safehouseName: 'Tanglaw Safehouse 2', currentOccupancy: 8,  capacityGirls: 10 },
    { safehouseName: 'Tanglaw Safehouse 3', currentOccupancy: 9,  capacityGirls: 9  },
    { safehouseName: 'Tanglaw Safehouse 4', currentOccupancy: 12, capacityGirls: 12 },
    { safehouseName: 'Tanglaw Safehouse 5', currentOccupancy: 9,  capacityGirls: 11 },
    { safehouseName: 'Tanglaw Safehouse 6', currentOccupancy: 6,  capacityGirls: 8  },
    { safehouseName: 'Tanglaw Safehouse 7', currentOccupancy: 12, capacityGirls: 12 },
    { safehouseName: 'Tanglaw Safehouse 8', currentOccupancy: 7,  capacityGirls: 9  },
    { safehouseName: 'Tanglaw Safehouse 9', currentOccupancy: 6,  capacityGirls: 6  },
  ],
};

export const MOCK_SAFEHOUSE_PERFORMANCE: SafehousePerformanceSummary = {
  safehouses: [
    { safehouseId: 1, safehouseName: 'Tanglaw Safehouse 1', currentOccupancy: 8,  capacityGirls: 8,  residentCount: 8,  incidentCount: 11, donationAllocationTotal: 25400 },
    { safehouseId: 2, safehouseName: 'Tanglaw Safehouse 2', currentOccupancy: 8,  capacityGirls: 10, residentCount: 8,  incidentCount: 9,  donationAllocationTotal: 22100 },
    { safehouseId: 3, safehouseName: 'Tanglaw Safehouse 3', currentOccupancy: 9,  capacityGirls: 9,  residentCount: 9,  incidentCount: 14, donationAllocationTotal: 28700 },
    { safehouseId: 4, safehouseName: 'Tanglaw Safehouse 4', currentOccupancy: 12, capacityGirls: 12, residentCount: 12, incidentCount: 16, donationAllocationTotal: 31200 },
    { safehouseId: 5, safehouseName: 'Tanglaw Safehouse 5', currentOccupancy: 9,  capacityGirls: 11, residentCount: 9,  incidentCount: 8,  donationAllocationTotal: 19800 },
    { safehouseId: 6, safehouseName: 'Tanglaw Safehouse 6', currentOccupancy: 6,  capacityGirls: 8,  residentCount: 6,  incidentCount: 7,  donationAllocationTotal: 17500 },
    { safehouseId: 7, safehouseName: 'Tanglaw Safehouse 7', currentOccupancy: 12, capacityGirls: 12, residentCount: 12, incidentCount: 15, donationAllocationTotal: 33800 },
    { safehouseId: 8, safehouseName: 'Tanglaw Safehouse 8', currentOccupancy: 7,  capacityGirls: 9,  residentCount: 7,  incidentCount: 10, donationAllocationTotal: 21300 },
    { safehouseId: 9, safehouseName: 'Tanglaw Safehouse 9', currentOccupancy: 6,  capacityGirls: 6,  residentCount: 6,  incidentCount: 10, donationAllocationTotal: 16800 },
  ],
  monthlyTrends: [],
};

export const MOCK_SOCIAL_ANALYTICS: SocialAnalytics = {
  totals: { totalPosts: 812, totalImpressions: 125480, totalReach: 97320, totalDonationReferrals: 7, totalEstimatedValuePhp: 4250, avgEngagementRate: 0.069 },
  platformSummaries: [
    { platform: 'Facebook',  averageEngagementRate: 0.072, totalDonationReferrals: 4, estimatedDonationValuePhp: 2100 },
    { platform: 'Instagram', averageEngagementRate: 0.081, totalDonationReferrals: 2, estimatedDonationValuePhp: 1450 },
    { platform: 'TikTok',    averageEngagementRate: 0.054, totalDonationReferrals: 1, estimatedDonationValuePhp: 700  },
  ],
  posts: [
    { id: 1, platform: 'Facebook',  postType: 'ImpactStory',       caption: null, createdAtUtc: '2026-03-15T10:00:00Z', campaignName: 'Year-End Hope',   impressions: 4820, reach: 3910, likes: 287, comments: 34, shares: 18, clickThroughs: 22, engagementRate: 0.074, donationReferrals: 2, estimatedDonationValuePhp: 1200, isBoosted: true  },
    { id: 2, platform: 'Instagram', postType: 'EventHighlight',    caption: null, createdAtUtc: '2026-03-10T14:30:00Z', campaignName: null,              impressions: 3620, reach: 2980, likes: 215, comments: 19, shares: 11, clickThroughs: 15, engagementRate: 0.068, donationReferrals: 1, estimatedDonationValuePhp: 800,  isBoosted: false },
    { id: 3, platform: 'TikTok',    postType: 'Awareness',         caption: null, createdAtUtc: '2026-03-08T09:00:00Z', campaignName: null,              impressions: 8140, reach: 6720, likes: 412, comments: 58, shares: 37, clickThroughs: 31, engagementRate: 0.063, donationReferrals: 0, estimatedDonationValuePhp: 0,    isBoosted: false },
    { id: 4, platform: 'Facebook',  postType: 'DonationAsk',       caption: null, createdAtUtc: '2026-02-28T11:00:00Z', campaignName: 'Community Care',  impressions: 2940, reach: 2310, likes: 198, comments: 27, shares: 14, clickThroughs: 19, engagementRate: 0.082, donationReferrals: 2, estimatedDonationValuePhp: 900,  isBoosted: true  },
    { id: 5, platform: 'Instagram', postType: 'ImpactStory',       caption: null, createdAtUtc: '2026-02-22T16:00:00Z', campaignName: null,              impressions: 3280, reach: 2740, likes: 243, comments: 31, shares: 16, clickThroughs: 18, engagementRate: 0.089, donationReferrals: 1, estimatedDonationValuePhp: 650,  isBoosted: false },
    { id: 6, platform: 'Facebook',  postType: 'VolunteerSpotlight', caption: null, createdAtUtc: '2026-02-18T08:30:00Z', campaignName: null,             impressions: 2190, reach: 1840, likes: 156, comments: 22, shares: 9,  clickThroughs: 12, engagementRate: 0.071, donationReferrals: 0, estimatedDonationValuePhp: 0,    isBoosted: false },
  ],
  page: 1,
  pageSize: 6,
  totalPosts: 812,
};

export const MOCK_DONATION_TRENDS: DonationTrends = {
  monthlyTotals: [
    { periodLabel: '2025-08', totalAmount: 4820,  donationCount: 28 },
    { periodLabel: '2025-09', totalAmount: 5140,  donationCount: 31 },
    { periodLabel: '2025-10', totalAmount: 4390,  donationCount: 26 },
    { periodLabel: '2025-11', totalAmount: 6820,  donationCount: 38 },
    { periodLabel: '2025-12', totalAmount: 7240,  donationCount: 42 },
    { periodLabel: '2026-01', totalAmount: 5610,  donationCount: 35 },
    { periodLabel: '2026-02', totalAmount: 4290,  donationCount: 27 },
    { periodLabel: '2026-03', totalAmount: 343,   donationCount: 9  },
  ],
  recurringDonationCount: 168,
  oneTimeDonationCount: 252,
  contributionMix: [
    { donationType: 'Monetary', totalAmount: 240725, donationCount: 252 },
    { donationType: 'In-Kind',  totalAmount: 87420,  donationCount: 112 },
    { donationType: 'Time',     totalAmount: 42380,  donationCount: 56  },
  ],
  campaignSummaries: [
    { campaignName: 'Year-End Hope',   totalAmount: 48200,  donationCount: 68  },
    { campaignName: 'Community Care',  totalAmount: 32400,  donationCount: 45  },
    { campaignName: 'Direct Support',  totalAmount: 160125, donationCount: 307 },
  ],
  channelSummaries: [
    { channelSource: 'Campaign', totalAmount: 120400, donationCount: 185 },
    { channelSource: 'Event',    totalAmount: 84300,  donationCount: 142 },
    { channelSource: 'Online',   totalAmount: 36025,  donationCount: 93  },
  ],
};

export const MOCK_RESIDENT_OUTCOMES: ResidentOutcomeSummary = {
  interventionPlanStatuses: [
    { label: 'In Progress', count: 17 },
    { label: 'Open',        count: 8  },
    { label: 'On Hold',     count: 12 },
    { label: 'Achieved',    count: 10 },
    { label: 'Closed',      count: 1  },
  ],
  riskDistribution: [
    { label: 'Low',      count: 34 },
    { label: 'Medium',   count: 20 },
    { label: 'High',     count: 5  },
    { label: 'Critical', count: 1  },
  ],
  followUpBurden: { visitsNeedingFollowUp: 549, openIncidents: 29, highRiskResidents: 6 },
  processRecordingSummary: { progressNoted: 873, concernsFlagged: 1092, referralsMade: 1254 },
  reintegrationStatuses: [
    { label: 'In Progress', count: 21 },
    { label: 'Completed',   count: 19 },
    { label: 'Not Started', count: 7  },
    { label: 'On Hold',     count: 13 },
  ],
};

export const MOCK_REINTEGRATION_SUMMARY: ReintegrationSummary = {
  reintegrationStatuses: [
    { label: 'In Progress', count: 21 },
    { label: 'Completed',   count: 19 },
    { label: 'Not Started', count: 7  },
    { label: 'On Hold',     count: 13 },
  ],
  reintegrationTypes: [
    { label: 'Family Reunification', count: 28 },
    { label: 'Community',            count: 18 },
    { label: 'Independent Living',   count: 14 },
  ],
  residentsClosed: 19,
  residentsActive: 30,
};

export const MOCK_OUTREACH_PERFORMANCE: OutreachPerformanceSummary = {
  platformSummaries: [
    { platform: 'Facebook',  averageEngagementRate: 0.072, totalDonationReferrals: 4, estimatedDonationValuePhp: 2100 },
    { platform: 'Instagram', averageEngagementRate: 0.081, totalDonationReferrals: 2, estimatedDonationValuePhp: 1450 },
    { platform: 'TikTok',    averageEngagementRate: 0.054, totalDonationReferrals: 1, estimatedDonationValuePhp: 700  },
  ],
  recentPosts: [
    { platform: 'Facebook',  postType: 'ImpactStory',    engagementRate: 0.074, donationReferrals: 2, estimatedDonationValuePhp: 1200 },
    { platform: 'Instagram', postType: 'EventHighlight', engagementRate: 0.068, donationReferrals: 1, estimatedDonationValuePhp: 800  },
    { platform: 'TikTok',    postType: 'Awareness',      engagementRate: 0.063, donationReferrals: 0, estimatedDonationValuePhp: 0    },
  ],
};

export const MOCK_COUNSELING_RISK_SUMMARY: CounselingRiskSummary = {
  evaluatedSessions: 2819,
  highRiskCount: 142,
  mediumRiskCount: 487,
  lowRiskCount: 2190,
  topRiskSessions: [],
};
