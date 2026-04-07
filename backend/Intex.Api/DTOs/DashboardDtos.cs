namespace Intex.Api.DTOs;

public record DashboardSummaryResponse(
    int ActiveResidents,
    int SafehouseCount,
    decimal DonationsThisMonth,
    int OpenInterventionPlans,
    int HomeVisitsThisMonth,
    int SocialPostsThisMonth,
    int HighRiskResidents,
    int VisitsNeedingFollowUp,
    int OpenIncidents,
    IReadOnlyList<RecentDonationDto> RecentDonations,
    IReadOnlyList<SafehouseUtilizationDto> SafehouseUtilization,
    IReadOnlyList<UpcomingCaseConferenceDto> UpcomingCaseConferences,
    ProcessProgressSummaryDto ProgressSummary);

public record RecentDonationDto(int DonationId, string SupporterName, decimal Amount, DateOnly DonationDate, string DonationType);

public record SafehouseUtilizationDto(string SafehouseName, int CurrentOccupancy, int CapacityGirls);

public record ProcessProgressSummaryDto(int ProgressNoted, int ConcernsFlagged, int ReferralsMade);

public record PublicImpactMetricDto(string Label, string Value);

public record PublicImpactSnapshotResponse(
    int Id,
    DateOnly SnapshotDate,
    string Headline,
    string SummaryText,
    IReadOnlyList<PublicImpactMetricDto> Metrics);
