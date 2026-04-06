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
                .ToListAsync());

        return Ok(response);
    }

    [HttpGet("analytics")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<IActionResult> GetAnalytics()
    {
        var safehouseDonationTotals = await dbContext.DonationAllocations
            .Include(x => x.Safehouse)
            .GroupBy(x => x.Safehouse!.Name)
            .Select(group => new
            {
                safehouse = group.Key,
                totalAllocated = group.Sum(x => x.AmountAllocated)
            })
            .OrderByDescending(x => x.totalAllocated)
            .ToListAsync();

        var socialPerformance = await dbContext.SocialMediaPosts
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(6)
            .Select(x => new
            {
                x.Platform,
                x.PostType,
                x.EngagementRate,
                x.DonationReferrals
            })
            .ToListAsync();

        return Ok(new
        {
            donationAllocationsBySafehouse = safehouseDonationTotals,
            socialPerformance
        });
    }
}
