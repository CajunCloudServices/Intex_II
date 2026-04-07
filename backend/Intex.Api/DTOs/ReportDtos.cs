namespace Intex.Api.DTOs;

public record DonationTrendPointDto(string PeriodLabel, decimal TotalAmount, int DonationCount);

public record ContributionMixDto(string DonationType, decimal TotalAmount, int DonationCount);

public record CampaignSummaryDto(string CampaignName, decimal TotalAmount, int DonationCount);

public record ChannelSummaryDto(string ChannelSource, decimal TotalAmount, int DonationCount);

public record DonationTrendsResponse(
    IReadOnlyList<DonationTrendPointDto> MonthlyTotals,
    int RecurringDonationCount,
    int OneTimeDonationCount,
    IReadOnlyList<ContributionMixDto> ContributionMix,
    IReadOnlyList<CampaignSummaryDto> CampaignSummaries,
    IReadOnlyList<ChannelSummaryDto> ChannelSummaries);

public record BreakdownItemDto(string Label, int Count);

public record FollowUpBurdenDto(int VisitsNeedingFollowUp, int OpenIncidents, int HighRiskResidents);

public record ProcessRecordingSummaryDto(int ProgressNoted, int ConcernsFlagged, int ReferralsMade);

public record ResidentOutcomesResponse(
    IReadOnlyList<BreakdownItemDto> InterventionPlanStatuses,
    IReadOnlyList<BreakdownItemDto> RiskDistribution,
    FollowUpBurdenDto FollowUpBurden,
    ProcessRecordingSummaryDto ProcessRecordingSummary,
    IReadOnlyList<BreakdownItemDto> ReintegrationStatuses);

public record SafehousePerformanceRowDto(
    int SafehouseId,
    string SafehouseName,
    int CurrentOccupancy,
    int CapacityGirls,
    int ResidentCount,
    int IncidentCount,
    decimal DonationAllocationTotal);

public record SafehouseMonthlyTrendPointDto(
    DateOnly MonthStart,
    int ActiveResidents,
    decimal AvgEducationProgress,
    decimal AvgHealthScore,
    int ProcessRecordingCount,
    int HomeVisitationCount,
    int IncidentCount);

public record SafehouseTrendRowDto(
    int SafehouseId,
    string SafehouseName,
    IReadOnlyList<SafehouseMonthlyTrendPointDto> MonthlyTrend);

public record SafehousePerformanceResponse(
    IReadOnlyList<SafehousePerformanceRowDto> Safehouses,
    IReadOnlyList<SafehouseTrendRowDto> MonthlyTrends);

public record ReintegrationSummaryResponse(
    IReadOnlyList<BreakdownItemDto> ReintegrationStatuses,
    IReadOnlyList<BreakdownItemDto> ReintegrationTypes,
    int ResidentsClosed,
    int ResidentsActive);

public record OutreachPerformanceRowDto(
    string Platform,
    string PostType,
    decimal EngagementRate,
    int DonationReferrals,
    decimal EstimatedDonationValuePhp);

public record PlatformPerformanceDto(
    string Platform,
    decimal AverageEngagementRate,
    int TotalDonationReferrals,
    decimal EstimatedDonationValuePhp);

public record OutreachPerformanceResponse(
    IReadOnlyList<PlatformPerformanceDto> PlatformSummaries,
    IReadOnlyList<OutreachPerformanceRowDto> RecentPosts);

public record SocialPostDetailDto(
    int Id,
    string Platform,
    string PostType,
    string? Caption,
    DateTime CreatedAtUtc,
    string? CampaignName,
    int Impressions,
    int Reach,
    int Likes,
    int Comments,
    int Shares,
    int ClickThroughs,
    decimal EngagementRate,
    int DonationReferrals,
    decimal EstimatedDonationValuePhp,
    bool IsBoosted);

public record SocialAnalyticsTotalsDto(
    int TotalPosts,
    int TotalImpressions,
    int TotalReach,
    int TotalDonationReferrals,
    decimal TotalEstimatedValuePhp,
    decimal AvgEngagementRate);

// TODO: Add optional ?platform=&type=&from=&to=&page=&pageSize= query params when post volumes grow.
public record SocialAnalyticsResponse(
    SocialAnalyticsTotalsDto Totals,
    IReadOnlyList<PlatformPerformanceDto> PlatformSummaries,
    IReadOnlyList<SocialPostDetailDto> Posts);
