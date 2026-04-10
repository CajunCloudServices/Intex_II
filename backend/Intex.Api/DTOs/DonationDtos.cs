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
    [Required, MinLength(1)] List<DonationAllocationRequest> Allocations) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (DonationDate == default)
        {
            yield return new ValidationResult("Donation date is required.", [nameof(DonationDate)]);
        }

        if (Amount.HasValue && Amount.Value <= 0m)
        {
            yield return new ValidationResult("Amount must be greater than 0 when provided.", [nameof(Amount)]);
        }

        if (string.Equals(DonationType, "Monetary", StringComparison.OrdinalIgnoreCase) && !Amount.HasValue)
        {
            yield return new ValidationResult("Amount is required for monetary donations.", [nameof(Amount)]);
        }

        if (Amount.HasValue && string.IsNullOrWhiteSpace(CurrencyCode))
        {
            yield return new ValidationResult("Currency code is required when an amount is provided.", [nameof(CurrencyCode)]);
        }

        var allocationTotal = Allocations.Sum(allocation => allocation.AmountAllocated);
        if (allocationTotal <= 0m)
        {
            yield return new ValidationResult("At least one positive allocation is required.", [nameof(Allocations)]);
            yield break;
        }

        var expectedTotal = Amount ?? EstimatedValue;
        if (Math.Abs(allocationTotal - expectedTotal) > 0.01m)
        {
            yield return new ValidationResult(
                "Allocation totals must match the donation value.",
                [nameof(Allocations), nameof(Amount), nameof(EstimatedValue)]);
        }
    }
}

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
    int EstimatedVictimsImpacted);

public record PublicDonationSubmissionRequest(
    bool IsAnonymous,
    [StringLength(120)] string? DonorName,
    [EmailAddress, StringLength(320)] string? DonorEmail,
    [Range(typeof(decimal), "0.01", "999999999.99")] decimal Amount,
    bool IsRecurring,
    [StringLength(30)] string? RecurringInterval,
    [StringLength(2000)] string? Notes) : IValidatableObject
{
    private static readonly string[] AllowedRecurringIntervals = ["Weekly", "Monthly", "Quarterly", "Annually"];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (IsRecurring && string.IsNullOrWhiteSpace(RecurringInterval))
        {
            yield return new ValidationResult("Recurring interval is required when recurring is selected.", [nameof(RecurringInterval)]);
        }

        if (!string.IsNullOrWhiteSpace(RecurringInterval) &&
            !AllowedRecurringIntervals.Contains(RecurringInterval, StringComparer.OrdinalIgnoreCase))
        {
            yield return new ValidationResult(
                $"Recurring interval must be one of: {string.Join(", ", AllowedRecurringIntervals)}.",
                [nameof(RecurringInterval)]);
        }
    }
}

public record PublicDonationSubmissionResponse(
    int DonationId,
    int SupporterId,
    string SupporterName,
    bool IsAnonymous,
    decimal Amount,
    bool IsRecurring,
    string? RecurringInterval,
    string Message);
