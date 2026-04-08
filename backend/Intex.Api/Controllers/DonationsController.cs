using System.Security.Claims;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Intex.Api.Models.Options;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationsController(
    ApplicationDbContext dbContext,
    IAuditLogService auditLogService,
    IOptions<DonationImpactOptions> donationImpactOptions) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<IEnumerable<DonationResponse>>> GetAll()
    {
        var donations = await QueryDonations()
            .OrderByDescending(x => x.DonationDate)
            .ToListAsync();

        return Ok(donations.Select(MapDonation));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<DonationResponse>> GetById(int id)
    {
        var donation = await QueryDonations().FirstOrDefaultAsync(x => x.Id == id);
        return donation is null ? NotFound() : Ok(MapDonation(donation));
    }

    [HttpGet("my-history")]
    [Authorize(Policy = Policies.DonorOnly)]
    public async Task<ActionResult<IEnumerable<DonationResponse>>> GetMyHistory()
    {
        var supporterId = ResolveSupporterId();
        if (supporterId is null)
        {
            return Forbid();
        }

        var donations = await QueryDonations()
            .Where(x => x.SupporterId == supporterId.Value)
            .OrderByDescending(x => x.DonationDate)
            .ToListAsync();

        return Ok(donations.Select(MapDonation));
    }

    [HttpGet("my-impact-summary")]
    [Authorize(Policy = Policies.DonorOnly)]
    public async Task<ActionResult<DonorImpactSummaryResponse>> GetMyImpactSummary()
    {
        var supporterId = ResolveSupporterId();
        if (supporterId is null)
        {
            return Forbid();
        }

        var donations = await dbContext.Donations
            .Where(x => x.SupporterId == supporterId.Value)
            .ToListAsync();

        if (donations.Count == 0)
        {
            return Ok(new DonorImpactSummaryResponse(0m, 0, 0, 0m));
        }

        var total = donations.Sum(x => x.Amount ?? x.EstimatedValue);
        var recurring = donations.Count(x => x.IsRecurring);
        return Ok(new DonorImpactSummaryResponse(
            total,
            donations.Count,
            recurring,
            total / donations.Count));
    }

    [HttpGet("my-allocation-breakdown")]
    [Authorize(Policy = Policies.DonorOnly)]
    public async Task<ActionResult<DonorAllocationBreakdownResponse>> GetMyAllocationBreakdown()
    {
        var supporterId = ResolveSupporterId();
        if (supporterId is null)
        {
            return Forbid();
        }

        var allocations = await dbContext.DonationAllocations
            .Include(x => x.Donation)
            .Include(x => x.Safehouse)
            .Where(x => x.Donation!.SupporterId == supporterId.Value)
            .ToListAsync();

        var totalAllocated = allocations.Sum(x => x.AmountAllocated);
        var items = allocations
            .GroupBy(x => new { x.SafehouseId, SafehouseName = x.Safehouse!.Name, x.ProgramArea })
            .OrderByDescending(group => group.Sum(a => a.AmountAllocated))
            .Select(group =>
            {
                var amount = group.Sum(a => a.AmountAllocated);
                return new DonorAllocationBreakdownItemResponse(
                    group.Key.SafehouseId,
                    group.Key.SafehouseName,
                    group.Key.ProgramArea,
                    amount,
                    group.Count(),
                    totalAllocated <= 0 ? 0 : Math.Round((amount / totalAllocated) * 100m, 2));
            })
            .ToList();

        return Ok(new DonorAllocationBreakdownResponse(totalAllocated, items));
    }

    [HttpGet("predict-impact")]
    [AllowAnonymous]
    public async Task<ActionResult<DonationImpactPredictionResponse>> PredictImpact([FromQuery] decimal amount)
    {
        if (amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than 0." });
        }

        var monetaryAllocations = await dbContext.DonationAllocations
            .Include(x => x.Donation)
            .Where(x => x.Donation!.DonationType == "Monetary")
            .ToListAsync();

        var options = donationImpactOptions.Value;
        var fallbackAreas = options.ProgramAreaUnitCosts.Keys.ToList();

        Dictionary<string, decimal> areaSplits;
        if (monetaryAllocations.Count == 0)
        {
            var equalWeight = fallbackAreas.Count == 0 ? 0 : 1m / fallbackAreas.Count;
            areaSplits = fallbackAreas.ToDictionary(a => a, _ => equalWeight, StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            var total = monetaryAllocations.Sum(x => x.AmountAllocated);
            areaSplits = monetaryAllocations
                .GroupBy(x => x.ProgramArea)
                .ToDictionary(
                    group => group.Key,
                    group => total <= 0 ? 0m : group.Sum(x => x.AmountAllocated) / total,
                    StringComparer.OrdinalIgnoreCase);
        }

        var outcomes = areaSplits
            .OrderByDescending(x => x.Value)
            .Select(split =>
            {
                var allocatedAmount = Math.Round(amount * split.Value, 2);
                var unitCost = options.ProgramAreaUnitCosts.TryGetValue(split.Key, out var configuredCost) ? configuredCost : 100m;
                var unit = options.ProgramAreaOutcomeUnits.TryGetValue(split.Key, out var configuredUnit) ? configuredUnit : "outcome units";
                var estimatedUnits = unitCost <= 0 ? 0m : Math.Round(allocatedAmount / unitCost, 2);
                return new DonationImpactPredictionOutcomeResponse(
                    split.Key,
                    allocatedAmount,
                    unit,
                    unitCost,
                    estimatedUnits);
            })
            .ToList();

        var averageCostPerVictim = options.AverageCostPerVictim <= 0 ? 250m : options.AverageCostPerVictim;
        var estimatedVictimsImpacted = Math.Round(amount / averageCostPerVictim, 2);

        return Ok(new DonationImpactPredictionResponse(
            amount,
            outcomes,
            "Prediction uses weighted historical monetary allocation mix and configured program-area unit costs.",
            estimatedVictimsImpacted));
    }

    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<DonationResponse>> Create(DonationRequest request)
    {
        var donation = new Donation
        {
            SupporterId = request.SupporterId,
            DonationType = request.DonationType,
            DonationDate = request.DonationDate,
            ChannelSource = request.ChannelSource,
            CurrencyCode = request.CurrencyCode,
            Amount = request.Amount,
            EstimatedValue = request.EstimatedValue,
            ImpactUnit = request.ImpactUnit,
            IsRecurring = request.IsRecurring,
            CampaignName = request.CampaignName,
            Notes = request.Notes,
            Allocations = request.Allocations.Select(allocation => new DonationAllocation
            {
                SafehouseId = allocation.SafehouseId,
                ProgramArea = allocation.ProgramArea,
                AmountAllocated = allocation.AmountAllocated,
                AllocationDate = allocation.AllocationDate,
                AllocationNotes = allocation.AllocationNotes
            }).ToList()
        };

        dbContext.Donations.Add(donation);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(Donation), donation.Id, $"Created {donation.DonationType} donation for supporter #{donation.SupporterId}.", User);

        var createdDonation = await QueryDonations().FirstAsync(x => x.Id == donation.Id);
        return CreatedAtAction(nameof(GetById), new { id = donation.Id }, MapDonation(createdDonation));
    }

    [HttpPost("public-submit")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicDonationSubmissionResponse>> PublicSubmit(PublicDonationSubmissionRequest request)
    {
        var recurringInterval = string.IsNullOrWhiteSpace(request.RecurringInterval)
            ? null
            : request.RecurringInterval.Trim();

        if (request.IsRecurring && string.IsNullOrWhiteSpace(recurringInterval))
        {
            return BadRequest(new { message = "Recurring interval is required when recurring is selected." });
        }

        var normalizedEmail = request.DonorEmail.Trim().ToLowerInvariant();
        var donorName = request.DonorName.Trim();

        var supporter = await dbContext.Supporters.FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);
        if (supporter is null)
        {
            supporter = new Supporter
            {
                SupporterType = "Individual",
                DisplayName = donorName,
                FirstName = donorName,
                RelationshipType = "Donor",
                Region = "Unknown",
                Country = "Unknown",
                Email = normalizedEmail,
                Status = "Active",
                FirstDonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                AcquisitionChannel = "Web",
                CreatedAtUtc = DateTime.UtcNow
            };
            dbContext.Supporters.Add(supporter);
            await dbContext.SaveChangesAsync();
        }
        else if (!string.Equals(supporter.DisplayName, donorName, StringComparison.Ordinal))
        {
            supporter.DisplayName = donorName;
        }

        var donation = new Donation
        {
            SupporterId = supporter.Id,
            DonationType = "Monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ChannelSource = "Online",
            CurrencyCode = "USD",
            Amount = request.Amount,
            EstimatedValue = request.Amount,
            ImpactUnit = "outcome units",
            IsRecurring = request.IsRecurring,
            Notes = recurringInterval is null
                ? request.Notes
                : $"Recurring interval: {recurringInterval}. {request.Notes}".Trim(),
        };

        dbContext.Donations.Add(donation);
        await dbContext.SaveChangesAsync();

        return Ok(new PublicDonationSubmissionResponse(
            donation.Id,
            supporter.Id,
            supporter.DisplayName,
            request.Amount,
            request.IsRecurring,
            recurringInterval,
            "Donation submitted successfully."));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<DonationResponse>> Update(int id, DonationRequest request)
    {
        var donation = await dbContext.Donations
            .Include(x => x.Allocations)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (donation is null)
        {
            return NotFound();
        }

        donation.SupporterId = request.SupporterId;
        donation.DonationType = request.DonationType;
        donation.DonationDate = request.DonationDate;
        donation.ChannelSource = request.ChannelSource;
        donation.CurrencyCode = request.CurrencyCode;
        donation.Amount = request.Amount;
        donation.EstimatedValue = request.EstimatedValue;
        donation.ImpactUnit = request.ImpactUnit;
        donation.IsRecurring = request.IsRecurring;
        donation.CampaignName = request.CampaignName;
        donation.Notes = request.Notes;

        dbContext.DonationAllocations.RemoveRange(donation.Allocations);
        donation.Allocations = request.Allocations.Select(allocation => new DonationAllocation
        {
            SafehouseId = allocation.SafehouseId,
            ProgramArea = allocation.ProgramArea,
            AmountAllocated = allocation.AmountAllocated,
            AllocationDate = allocation.AllocationDate,
            AllocationNotes = allocation.AllocationNotes
        }).ToList();

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(Donation), donation.Id, $"Updated {donation.DonationType} donation for supporter #{donation.SupporterId}.", User);
        var updatedDonation = await QueryDonations().FirstAsync(x => x.Id == id);
        return Ok(MapDonation(updatedDonation));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var donation = await dbContext.Donations.FindAsync(id);
        if (donation is null)
        {
            return NotFound();
        }

        var summary = $"Deleted {donation.DonationType} donation for supporter #{donation.SupporterId}.";
        dbContext.Donations.Remove(donation);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(Donation), id, summary, User);
        return NoContent();
    }

    private IQueryable<Donation> QueryDonations() =>
        dbContext.Donations
            .Include(x => x.Supporter)
            .Include(x => x.Allocations)
            .ThenInclude(x => x.Safehouse);

    private int? ResolveSupporterId()
    {
        var supporterIdClaim = User.FindFirstValue("supporter_id");
        return int.TryParse(supporterIdClaim, out var supporterId) ? supporterId : null;
    }

    private static DonationResponse MapDonation(Donation donation) =>
        new(
            donation.Id,
            donation.SupporterId,
            donation.Supporter?.DisplayName ?? "Unknown supporter",
            donation.DonationType,
            donation.DonationDate,
            donation.ChannelSource,
            donation.CurrencyCode,
            donation.Amount,
            donation.EstimatedValue,
            donation.ImpactUnit,
            donation.IsRecurring,
            donation.CampaignName,
            donation.Notes,
            donation.Allocations
                .OrderBy(a => a.AllocationDate)
                .Select(a => new DonationAllocationResponse(
                    a.Id,
                    a.SafehouseId,
                    a.Safehouse?.Name ?? "Unknown safehouse",
                    a.ProgramArea,
                    a.AmountAllocated,
                    a.AllocationDate,
                    a.AllocationNotes))
                .ToList());
}
