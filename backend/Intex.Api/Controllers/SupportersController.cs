using System.ComponentModel.DataAnnotations;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class SupportersController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupporterResponse>>> GetAll([FromQuery, StringLength(200)] string? search)
    {
        var query = BuildSupporterResponseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.ToLower();
            query = query.Where(x =>
                x.DisplayName.ToLower().Contains(normalizedSearch) ||
                x.Email.ToLower().Contains(normalizedSearch));
        }

        var supporters = await query
            .OrderBy(x => x.DisplayName)
            .ToListAsync();

        return Ok(supporters);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SupporterResponse>> GetById(int id)
    {
        var supporter = await BuildSupporterResponseQuery()
            .Where(x => x.Id == id)
            .FirstOrDefaultAsync();

        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpGet("churn-risk-summary")]
    public async Task<ActionResult<DonorChurnRiskSummaryResponse>> GetChurnRiskSummary([FromQuery, Range(1, 50)] int top = 15)
    {
        var supporters = await dbContext.Supporters
            .AsNoTracking()
            .Include(x => x.Donations)
            .ToListAsync();

        if (supporters.Count == 0)
        {
            return Ok(new DonorChurnRiskSummaryResponse(0, 0, 0, 0, []));
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rows = supporters.Select(supporter =>
        {
            var donationCount = supporter.Donations.Count;
            var lifetimeDonation = supporter.Donations.Sum(x => x.Amount ?? x.EstimatedValue);
            var lastDonation = supporter.Donations
                .OrderByDescending(x => x.DonationDate)
                .Select(x => (DateOnly?)x.DonationDate)
                .FirstOrDefault();
            var daysSinceLastDonation = lastDonation.HasValue
                ? today.DayNumber - lastDonation.Value.DayNumber
                : 999;

            var isRecurringDonor = supporter.Donations.Any(x => x.IsRecurring);
            var isActiveStatus = string.Equals(supporter.Status, "Active", StringComparison.OrdinalIgnoreCase);
            var isColdChannel = supporter.AcquisitionChannel.Equals("SocialMedia", StringComparison.OrdinalIgnoreCase)
                || supporter.AcquisitionChannel.Equals("Event", StringComparison.OrdinalIgnoreCase);

            var probability =
                0.18m +
                Math.Min(daysSinceLastDonation / 365m, 0.55m) +
                (donationCount <= 1 ? 0.18m : 0m) +
                (lifetimeDonation < 500m ? 0.08m : 0m) +
                (!isRecurringDonor ? 0.12m : -0.10m) +
                (!isActiveStatus ? 0.15m : 0m) +
                (isColdChannel ? 0.05m : 0m);

            var boundedProbability = Math.Clamp(probability, 0.01m, 0.99m);
            var riskTier = boundedProbability >= 0.70m ? "High"
                : boundedProbability >= 0.40m ? "Medium"
                : "Low";
            var action = riskTier switch
            {
                "High" => "Initiate personal outreach within 7 days and propose recurring support options.",
                "Medium" => "Queue donor for monthly retention touchpoint and tailored campaign follow-up.",
                _ => "Continue normal stewardship cadence."
            };

            return new DonorChurnRiskRowDto(
                supporter.Id,
                supporter.DisplayName,
                Math.Round(boundedProbability, 4),
                riskTier,
                lastDonation,
                lifetimeDonation,
                donationCount,
                daysSinceLastDonation,
                action);
        })
            .OrderByDescending(x => x.ChurnProbability)
            .ToList();

        return Ok(new DonorChurnRiskSummaryResponse(
            rows.Count,
            rows.Count(x => x.RiskTier == "High"),
            rows.Count(x => x.RiskTier == "Medium"),
            rows.Count(x => x.RiskTier == "Low"),
            rows.Take(Math.Clamp(top, 1, 50)).ToList()));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<SupporterResponse>> Create(SupporterRequest request)
    {
        var entity = new Supporter
        {
            SupporterType = request.SupporterType,
            DisplayName = request.DisplayName,
            OrganizationName = request.OrganizationName,
            FirstName = request.FirstName,
            LastName = request.LastName,
            RelationshipType = request.RelationshipType,
            Region = request.Region,
            Country = request.Country,
            Email = request.Email,
            Phone = request.Phone,
            Status = request.Status,
            FirstDonationDate = request.FirstDonationDate,
            AcquisitionChannel = request.AcquisitionChannel,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Supporters.Add(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(Supporter), entity.Id, $"Created supporter {entity.DisplayName}.", User);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, await BuildResponse(entity.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<SupporterResponse>> Update(int id, SupporterRequest request)
    {
        var entity = await dbContext.Supporters.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.SupporterType = request.SupporterType;
        entity.DisplayName = request.DisplayName;
        entity.OrganizationName = request.OrganizationName;
        entity.FirstName = request.FirstName;
        entity.LastName = request.LastName;
        entity.RelationshipType = request.RelationshipType;
        entity.Region = request.Region;
        entity.Country = request.Country;
        entity.Email = request.Email;
        entity.Phone = request.Phone;
        entity.Status = request.Status;
        entity.FirstDonationDate = request.FirstDonationDate;
        entity.AcquisitionChannel = request.AcquisitionChannel;

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(Supporter), entity.Id, $"Updated supporter {entity.DisplayName}.", User);
        return Ok(await BuildResponse(id));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var entity = await dbContext.Supporters.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        var summary = $"Deleted supporter {entity.DisplayName}.";
        dbContext.Supporters.Remove(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(Supporter), id, summary, User);
        return NoContent();
    }

    private IQueryable<SupporterResponse> BuildSupporterResponseQuery() =>
        dbContext.Supporters
            .AsNoTracking()
            .Include(x => x.Donations)
            .Select(x => new SupporterResponse(
                x.Id,
                x.SupporterType,
                x.DisplayName,
                x.OrganizationName,
                x.FirstName,
                x.LastName,
                x.RelationshipType,
                x.Region,
                x.Country,
                x.Email,
                x.Phone,
                x.Status,
                x.FirstDonationDate,
                x.AcquisitionChannel,
                x.CreatedAtUtc,
                x.Donations.Count,
                x.Donations.Sum(d => d.Amount ?? d.EstimatedValue)));

    private async Task<SupporterResponse> BuildResponse(int id) =>
        await BuildSupporterResponseQuery()
            .Where(x => x.Id == id)
            .FirstAsync();
}
