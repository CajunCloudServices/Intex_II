using System.Security.Claims;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationsController(ApplicationDbContext dbContext) : ControllerBase
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
        var supporterIdClaim = User.FindFirstValue("supporter_id");
        if (!int.TryParse(supporterIdClaim, out var supporterId))
        {
            return Forbid();
        }

        var donations = await QueryDonations()
            .Where(x => x.SupporterId == supporterId)
            .OrderByDescending(x => x.DonationDate)
            .ToListAsync();

        return Ok(donations.Select(MapDonation));
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

        var createdDonation = await QueryDonations().FirstAsync(x => x.Id == donation.Id);
        return CreatedAtAction(nameof(GetById), new { id = donation.Id }, MapDonation(createdDonation));
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

        dbContext.Donations.Remove(donation);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Donation> QueryDonations() =>
        dbContext.Donations
            .Include(x => x.Supporter)
            .Include(x => x.Allocations)
            .ThenInclude(x => x.Safehouse);

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
