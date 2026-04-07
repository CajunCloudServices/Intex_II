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
