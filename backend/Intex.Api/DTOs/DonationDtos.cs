using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record DonationAllocationRequest(
    [Range(1, int.MaxValue)] int SafehouseId,
    [Required, StringLength(50)] string ProgramArea,
    [Range(typeof(decimal), "0.01", "999999999.99")] decimal AmountAllocated,
    DateOnly AllocationDate,
    [StringLength(2000)] string? AllocationNotes);

public record DonationRequest(
    [Range(1, int.MaxValue)] int SupporterId,
    [Required, StringLength(30), RegularExpression(ValidationPatterns.DonationType)] string DonationType,
    DateOnly DonationDate,
    [Required, StringLength(30), RegularExpression(ValidationPatterns.DonationChannel)] string ChannelSource,
    [StringLength(3), RegularExpression(ValidationPatterns.CurrencyCode)] string? CurrencyCode,
    decimal? Amount,
    [Range(typeof(decimal), "0.01", "999999999.99")] decimal EstimatedValue,
    [Required, StringLength(30)] string ImpactUnit,
    bool IsRecurring,
    [StringLength(100)] string? CampaignName,
    [StringLength(2000)] string? Notes,
    [Required, MinLength(1)] List<DonationAllocationRequest> Allocations);

public record DonationAllocationResponse(
    int Id,
    int SafehouseId,
    string SafehouseName,
    string ProgramArea,
    decimal AmountAllocated,
    DateOnly AllocationDate,
    string? AllocationNotes);

public record DonationResponse(
    int Id,
    int SupporterId,
    string SupporterName,
    string DonationType,
    DateOnly DonationDate,
    string ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    decimal EstimatedValue,
    string ImpactUnit,
    bool IsRecurring,
    string? CampaignName,
    string? Notes,
    List<DonationAllocationResponse> Allocations);

public record DonorImpactSummaryResponse(
    decimal TotalDonated,
    int DonationCount,
    int RecurringDonationCount,
    decimal AverageDonationAmount);

public record DonorAllocationBreakdownItemResponse(
    int SafehouseId,
    string SafehouseName,
    string ProgramArea,
    decimal TotalAllocated,
    int AllocationCount,
    decimal SharePercent);

public record DonorAllocationBreakdownResponse(
    decimal TotalAllocated,
    IReadOnlyList<DonorAllocationBreakdownItemResponse> Items);

public record DonationImpactPredictionOutcomeResponse(
    string ProgramArea,
    decimal AllocatedAmount,
    string OutcomeUnit,
    decimal UnitCost,
    decimal EstimatedUnits);

public record DonationImpactPredictionResponse(
    decimal Amount,
    IReadOnlyList<DonationImpactPredictionOutcomeResponse> Outcomes,
    string Assumptions,
    decimal EstimatedVictimsImpacted);

public record PublicDonationSubmissionRequest(
    bool IsAnonymous,
    [StringLength(120)] string? DonorName,
    [EmailAddress, StringLength(320)] string? DonorEmail,
    [Range(typeof(decimal), "0.01", "999999999.99")] decimal Amount,
    bool IsRecurring,
    [StringLength(30)] string? RecurringInterval,
    [StringLength(2000)] string? Notes);

public record PublicDonationSubmissionResponse(
    int DonationId,
    int SupporterId,
    string SupporterName,
    bool IsAnonymous,
    decimal Amount,
    bool IsRecurring,
    string? RecurringInterval,
    string Message);
