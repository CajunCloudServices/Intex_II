using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Intex.Api.Models.Options;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
            .AsNoTracking()
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
            .AsNoTracking()
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
    [EnableRateLimiting("public-submit")]
    public async Task<ActionResult<DonationImpactPredictionResponse>> PredictImpact(
        [FromQuery, Range(typeof(decimal), "0.01", "999999999.99")] decimal amount)

    {
        if (amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than 0." });
        }

        var monetaryAllocations = await dbContext.DonationAllocations
            .AsNoTracking()
            .Include(x => x.Donation)
            .Where(x => x.Donation!.DonationType == "Monetary")
            .GroupBy(x => x.ProgramArea)
            .Select(g => new { ProgramArea = g.Key, Total = g.Sum(a => a.AmountAllocated) })
            .ToListAsync();
            
        var historicalTotals = historicalTotalsList
            .ToDictionary(x => x.ProgramArea, x => x.Total, StringComparer.OrdinalIgnoreCase);

        var options = donationImpactOptions.Value;
        var selectedSplits = BuildSelectedAreaSplits(historicalTotals, options, amount);
        var outcomes = BuildOutcomeRows(selectedSplits, options, amount);

        var averageCostPerVictim = options.AverageCostPerVictim <= 0 ? 250m : options.AverageCostPerVictim;
        // Donor-facing estimate should represent whole people, never decimals.
        // Round up so smaller gifts still map to at least one person impacted.
        var estimatedVictimsImpacted = Math.Max(1, (int)Math.Ceiling(amount / averageCostPerVictim));

        return Ok(new DonationImpactPredictionResponse(
            amount,
            outcomes,
            "Estimates blend historical gift allocations with a balanced default mix so education, wellbeing, operations, transport, and other pillars stay visible. Additional rows drop off only when the dollar slice would be very small. People impacted are a simple whole-person estimate.",
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
    [EnableRateLimiting("public-submit")]
    public async Task<ActionResult<PublicDonationSubmissionResponse>> PublicSubmit(PublicDonationSubmissionRequest request)
    {
        var recurringInterval = string.IsNullOrWhiteSpace(request.RecurringInterval)
            ? null
            : request.RecurringInterval.Trim();

        if (request.IsRecurring && string.IsNullOrWhiteSpace(recurringInterval))
        {
            return BadRequest(new { message = "Recurring interval is required when recurring is selected." });
        }

        Supporter supporter;
        var authenticatedSupporterId = ResolveSupporterId();
        if (request.IsAnonymous)
        {
            supporter = new Supporter
            {
                SupporterType = "Individual",
                DisplayName = "Anonymous donor",
                FirstName = "Anonymous",
                RelationshipType = "Donor",
                Region = "Unknown",
                Country = "Unknown",
                Email = $"anonymous+{Guid.NewGuid():N}@tanglaw.demo",
                Status = "Active",
                FirstDonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                AcquisitionChannel = "Web",
                CreatedAtUtc = DateTime.UtcNow
            };
            dbContext.Supporters.Add(supporter);
            await dbContext.SaveChangesAsync();
        }
        else if (authenticatedSupporterId.HasValue)
        {
            var linkedSupporter = await dbContext.Supporters.FirstOrDefaultAsync(x => x.Id == authenticatedSupporterId.Value);
            if (linkedSupporter is null)
            {
                return BadRequest(new { message = "Your donor account is missing a linked supporter record. Please sign in again or contact support." });
            }

            supporter = linkedSupporter;
        }
        else
        {
            var donorName = request.DonorName?.Trim() ?? string.Empty;
            var donorEmail = request.DonorEmail?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(donorName))
            {
                return BadRequest(new { message = "Please enter your name for a tracked donation." });
            }

            if (string.IsNullOrWhiteSpace(donorEmail))
            {
                return BadRequest(new { message = "Please enter your email for a tracked donation." });
            }

            var normalizedEmail = donorEmail.ToLowerInvariant();
            supporter = await dbContext.Supporters.FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail)
                ?? new Supporter
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

            if (supporter.Id == 0)
            {
                dbContext.Supporters.Add(supporter);
                await dbContext.SaveChangesAsync();
            }
        }

        var notesBase = recurringInterval is null
            ? request.Notes
            : $"Recurring interval: {recurringInterval}. {request.Notes}".Trim();

        if (!authenticatedSupporterId.HasValue)
        {
            notesBase = $"[UNVERIFIED PUBLIC SUBMISSION] {notesBase}".Trim();
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
            Notes = notesBase,
        };

        donation.Allocations = await BuildPublicDonationAllocationsAsync(request.Amount, donation.DonationDate);
        dbContext.Donations.Add(donation);
        await dbContext.SaveChangesAsync();

        return Ok(new PublicDonationSubmissionResponse(
            donation.Id,
            supporter.Id,
            supporter.DisplayName,
            request.IsAnonymous,
            request.Amount,
            request.IsRecurring,
            recurringInterval,
            request.IsAnonymous
                ? "Anonymous donation submitted successfully."
                : authenticatedSupporterId.HasValue
                    ? "Donor account donation submitted successfully."
                    : "Tracked donation submitted successfully."));
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
            .AsNoTracking()
            .Include(x => x.Supporter)
            .Include(x => x.Allocations)
            .ThenInclude(x => x.Safehouse);

    private int? ResolveSupporterId()
    {
        var supporterIdClaim = User.FindFirstValue("supporter_id");
        return int.TryParse(supporterIdClaim, out var supporterId) ? supporterId : null;
    }

    private async Task<List<DonationAllocation>> BuildPublicDonationAllocationsAsync(decimal amount, DateOnly allocationDate)
    {
        var primarySafehouse = await dbContext.Safehouses
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => new { x.Id })
            .FirstOrDefaultAsync();

        if (primarySafehouse is null)
        {
            return [];
        }

        var historicalTotalsList = await dbContext.DonationAllocations
            .AsNoTracking()
            .Where(x => x.Donation!.DonationType == "Monetary")
            .GroupBy(x => x.ProgramArea)
            .Select(g => new { ProgramArea = g.Key, Total = g.Sum(a => a.AmountAllocated) })
            .ToListAsync();

        var historicalTotals = historicalTotalsList
            .ToDictionary(x => x.ProgramArea, x => x.Total, StringComparer.OrdinalIgnoreCase);

        var options = donationImpactOptions.Value;
        var orderedAreas = BuildSelectedAreaSplits(historicalTotals, options, amount);

        var allocations = new List<DonationAllocation>();
        var allocatedTotal = 0m;

        for (var index = 0; index < orderedAreas.Count; index++)
        {
            var split = orderedAreas[index];
            var allocatedAmount = index == orderedAreas.Count - 1
                ? Math.Round(amount - allocatedTotal, 2)
                : Math.Round(amount * split.Value, 2);

            if (allocatedAmount <= 0m)
            {
                continue;
            }

            allocations.Add(new DonationAllocation
            {
                SafehouseId = primarySafehouse.Id,
                ProgramArea = split.Key,
                AmountAllocated = allocatedAmount,
                AllocationDate = allocationDate
            });

            allocatedTotal += allocatedAmount;
        }

        return allocations;
    }

    private static List<KeyValuePair<string, decimal>> BuildSelectedAreaSplits(
        Dictionary<string, decimal> historicalTotals,
        DonationImpactOptions options,
        decimal amount)
    {
        var configuredAreas = options.ProgramAreaUnitCosts.Keys
            .Concat(options.ProgramAreaOutcomeUnits.Keys)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (configuredAreas.Count == 0)
        {
            return [];
        }

        var totalHistorical = historicalTotals.Values.Sum();
        var baseSplits = configuredAreas.ToDictionary(
            area => area,
            area => totalHistorical <= 0m
                ? 1m / configuredAreas.Count
                : (historicalTotals.TryGetValue(area, out var v) ? v / totalHistorical : 0m),
            StringComparer.OrdinalIgnoreCase);

        // Normalize in case configured keys and historical keys drift.
        var splitTotal = baseSplits.Values.Sum();
        if (splitTotal <= 0m)
        {
            var equal = 1m / configuredAreas.Count;
            baseSplits = configuredAreas.ToDictionary(a => a, _ => equal, StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            baseSplits = baseSplits.ToDictionary(
                x => x.Key,
                x => x.Value / splitTotal,
                StringComparer.OrdinalIgnoreCase);
        }

        var blend = Math.Clamp(options.PreviewMixBlendWeight, 0m, 1m);
        if (blend > 0m)
        {
            var defaultMix = NormalizePreviewMix(options.DefaultPreviewAllocationMix, configuredAreas);
            baseSplits = configuredAreas.ToDictionary(
                area => area,
                area => (1m - blend) * baseSplits.GetValueOrDefault(area, 0m) + blend * defaultMix.GetValueOrDefault(area, 0m),
                StringComparer.OrdinalIgnoreCase);
            var blendSum = baseSplits.Values.Sum();
            if (blendSum > 0m)
            {
                baseSplits = baseSplits.ToDictionary(x => x.Key, x => x.Value / blendSum, StringComparer.OrdinalIgnoreCase);
            }
        }

        var maxProgramsShown = Math.Max(1, options.MaxProgramsShown);
        var minimumAllocationAmount = Math.Max(0m, options.MinimumAllocationAmount);
        var minRows = Math.Max(1, options.MinimumProgramRowsToShow);
        var candidates = baseSplits
            .OrderByDescending(x => x.Value)
            .ThenBy(x => x.Key)
            .Take(maxProgramsShown)
            .ToList();

        var filtered = candidates
            .Where((x, idx) =>
                idx < minRows ||
                Math.Round(amount * x.Value, 2) >= minimumAllocationAmount)
            .ToList();

        if (filtered.Count == 0)
        {
            filtered = [candidates[0]];
        }

        var filteredTotal = filtered.Sum(x => x.Value);
        if (filteredTotal <= 0m)
        {
            return filtered.Select(x => new KeyValuePair<string, decimal>(x.Key, 1m / filtered.Count)).ToList();
        }

        return filtered
            .Select(x => new KeyValuePair<string, decimal>(x.Key, x.Value / filteredTotal))
            .ToList();
    }

    private static List<DonationImpactPredictionOutcomeResponse> BuildOutcomeRows(
        List<KeyValuePair<string, decimal>> areaSplits,
        DonationImpactOptions options,
        decimal amount)
    {
        var outcomes = new List<DonationImpactPredictionOutcomeResponse>();
        var allocatedTotal = 0m;

        for (var index = 0; index < areaSplits.Count; index++)
        {
            var split = areaSplits[index];
            var allocatedAmount = index == areaSplits.Count - 1
                ? Math.Round(amount - allocatedTotal, 2)
                : Math.Round(amount * split.Value, 2);

            if (allocatedAmount <= 0m)
            {
                continue;
            }

            var unitCost = options.ProgramAreaUnitCosts.TryGetValue(split.Key, out var configuredCost) ? configuredCost : 100m;
            var unit = options.ProgramAreaOutcomeUnits.TryGetValue(split.Key, out var configuredUnit) ? configuredUnit : "outcome units";
            var estimatedUnits = unitCost <= 0 ? 0m : Math.Round(allocatedAmount / unitCost, 2);

            outcomes.Add(new DonationImpactPredictionOutcomeResponse(
                split.Key,
                allocatedAmount,
                unit,
                unitCost,
                estimatedUnits));

            allocatedTotal += allocatedAmount;
        }

        return outcomes;
    }

    private static Dictionary<string, decimal> NormalizePreviewMix(
        IReadOnlyDictionary<string, decimal> mix,
        IReadOnlyList<string> areas)
    {
        var raw = areas.ToDictionary(
            a => a,
            a => mix.TryGetValue(a, out var v) ? (v < 0m ? 0m : v) : 0m,
            StringComparer.OrdinalIgnoreCase);
        var sum = raw.Values.Sum();
        if (sum <= 0m)
        {
            var equal = 1m / Math.Max(areas.Count, 1);
            return areas.ToDictionary(a => a, _ => equal, StringComparer.OrdinalIgnoreCase);
        }

        return raw.ToDictionary(x => x.Key, x => x.Value / sum, StringComparer.OrdinalIgnoreCase);
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
