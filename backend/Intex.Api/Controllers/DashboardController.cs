using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("summary")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<DashboardSummaryResponse>> GetSummary()
    {
        var utcNow = DateTime.UtcNow;
        var monthStart = new DateOnly(utcNow.Year, utcNow.Month, 1);
        var monthStartUtc = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var donationsThisMonth = await dbContext.Donations
            .Where(x => x.DonationDate >= monthStart)
            .SumAsync(x => x.Amount ?? x.EstimatedValue);

        var response = new DashboardSummaryResponse(
            await dbContext.Residents.CountAsync(x => x.CaseStatus == "Active"),
            await dbContext.Safehouses.CountAsync(),
            donationsThisMonth,
            await dbContext.InterventionPlans.CountAsync(x => x.Status == "Open" || x.Status == "In Progress"),
            await dbContext.HomeVisitations.CountAsync(x => x.VisitDate >= monthStart),
            await dbContext.SocialMediaPosts.CountAsync(x => x.CreatedAtUtc >= monthStartUtc),
            await dbContext.Residents.CountAsync(x => x.CurrentRiskLevel == "High" || x.CurrentRiskLevel == "Critical"),
            await dbContext.HomeVisitations.CountAsync(x => x.FollowUpNeeded),
            await dbContext.IncidentReports.CountAsync(x => !x.Resolved),
            await dbContext.Donations
                .Include(x => x.Supporter)
                .OrderByDescending(x => x.DonationDate)
                .Take(5)
                .Select(x => new RecentDonationDto(
                    x.Id,
                    x.Supporter!.DisplayName,
                    x.Amount ?? x.EstimatedValue,
                    x.DonationDate,
                    x.DonationType))
                .ToListAsync(),
            await dbContext.Safehouses
                .OrderBy(x => x.Name)
                .Select(x => new SafehouseUtilizationDto(x.Name, x.CurrentOccupancy, x.CapacityGirls))
                .ToListAsync(),
            await dbContext.CaseConferences
                .Include(x => x.Resident)
                .Where(x => x.ConferenceDate >= monthStart)
                .OrderBy(x => x.ConferenceDate)
                .Take(5)
                .Select(x => new UpcomingCaseConferenceDto(
                    x.Id,
                    x.ResidentId,
                    x.Resident!.CaseControlNumber,
                    x.ConferenceDate,
                    x.LeadWorker,
                    x.Status))
                .ToListAsync(),
            new ProcessProgressSummaryDto(
                await dbContext.ProcessRecordings.CountAsync(x => x.ProgressNoted),
                await dbContext.ProcessRecordings.CountAsync(x => x.ConcernsFlagged),
                await dbContext.ProcessRecordings.CountAsync(x => x.ReferralMade)));

        return Ok(response);
    }

    [HttpGet("analytics")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<IActionResult> GetAnalytics()
    {
        return Ok(new
        {
            message = "Use the dedicated /api/reports endpoints for analytics modules."
        });
    }
}
