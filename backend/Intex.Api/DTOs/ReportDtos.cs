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

public record SafehousePerformanceResponse(IReadOnlyList<SafehousePerformanceRowDto> Safehouses);

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
