using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class ReportsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("donation-trends")]
    public async Task<ActionResult<DonationTrendsResponse>> GetDonationTrends()
    {
        var donations = await dbContext.Donations.ToListAsync();
        var totals = donations
            .GroupBy(x => new { x.DonationDate.Year, x.DonationDate.Month })
            .OrderBy(x => x.Key.Year)
            .ThenBy(x => x.Key.Month)
            .Select(group => new DonationTrendPointDto(
                $"{group.Key.Year}-{group.Key.Month:D2}",
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToList();

        var contributionMix = donations
            .GroupBy(x => x.DonationType)
            .OrderByDescending(x => x.Sum(y => y.Amount ?? y.EstimatedValue))
            .Select(group => new ContributionMixDto(
                group.Key,
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToList();

        var campaignSummaries = donations
            .Where(x => !string.IsNullOrWhiteSpace(x.CampaignName))
            .GroupBy(x => x.CampaignName!)
            .OrderByDescending(x => x.Sum(y => y.Amount ?? y.EstimatedValue))
            .Select(group => new CampaignSummaryDto(
                group.Key,
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToList();

        var channelSummaries = donations
            .GroupBy(x => x.ChannelSource)
            .OrderByDescending(x => x.Sum(y => y.Amount ?? y.EstimatedValue))
            .Select(group => new ChannelSummaryDto(
                group.Key,
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToList();

        return Ok(new DonationTrendsResponse(
            totals,
            donations.Count(x => x.IsRecurring),
            donations.Count(x => !x.IsRecurring),
            contributionMix,
            campaignSummaries,
            channelSummaries));
    }

    [HttpGet("resident-outcomes")]
    public async Task<ActionResult<ResidentOutcomesResponse>> GetResidentOutcomes()
    {
        var interventionStatuses = (await dbContext.InterventionPlans
            .GroupBy(x => x.Status)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var riskDistribution = (await dbContext.Residents
            .GroupBy(x => x.CurrentRiskLevel)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var reintegrationStatuses = (await dbContext.Residents
            .Where(x => x.ReintegrationStatus != null)
            .GroupBy(x => x.ReintegrationStatus!)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var progressSummary = new ProcessRecordingSummaryDto(
            await dbContext.ProcessRecordings.CountAsync(x => x.ProgressNoted),
            await dbContext.ProcessRecordings.CountAsync(x => x.ConcernsFlagged),
            await dbContext.ProcessRecordings.CountAsync(x => x.ReferralMade));

        var followUpBurden = new FollowUpBurdenDto(
            await dbContext.HomeVisitations.CountAsync(x => x.FollowUpNeeded),
            await dbContext.IncidentReports.CountAsync(x => !x.Resolved),
            await dbContext.Residents.CountAsync(x => x.CurrentRiskLevel == "High" || x.CurrentRiskLevel == "Critical"));

        return Ok(new ResidentOutcomesResponse(
            interventionStatuses,
            riskDistribution,
            followUpBurden,
            progressSummary,
            reintegrationStatuses));
    }

    [HttpGet("safehouse-performance")]
    public async Task<ActionResult<SafehousePerformanceResponse>> GetSafehousePerformance()
    {
        var safehouses = await dbContext.Safehouses
            .Include(x => x.Residents)
            .Include(x => x.IncidentReports)
            .Include(x => x.DonationAllocations)
            .OrderBy(x => x.Name)
            .Select(x => new SafehousePerformanceRowDto(
                x.Id,
                x.Name,
                x.CurrentOccupancy,
                x.CapacityGirls,
                x.Residents.Count,
                x.IncidentReports.Count,
                x.DonationAllocations.Sum(a => a.AmountAllocated)))
            .ToListAsync();

        return Ok(new SafehousePerformanceResponse(safehouses));
    }

    [HttpGet("reintegration-summary")]
    public async Task<ActionResult<ReintegrationSummaryResponse>> GetReintegrationSummary()
    {
        var statuses = (await dbContext.Residents
            .Where(x => x.ReintegrationStatus != null)
            .GroupBy(x => x.ReintegrationStatus!)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var types = (await dbContext.Residents
            .Where(x => x.ReintegrationType != null)
            .GroupBy(x => x.ReintegrationType!)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        return Ok(new ReintegrationSummaryResponse(
            statuses,
            types,
            await dbContext.Residents.CountAsync(x => x.CaseStatus == "Closed"),
            await dbContext.Residents.CountAsync(x => x.CaseStatus == "Active")));
    }

    [HttpGet("outreach-performance")]
    public async Task<ActionResult<OutreachPerformanceResponse>> GetOutreachPerformance()
    {
        var platformSummaries = (await dbContext.SocialMediaPosts
            .GroupBy(x => x.Platform)
            .Select(group => new
            {
                group.Key,
                AverageEngagementRate = group.Average(x => x.EngagementRate),
                TotalDonationReferrals = group.Sum(x => x.DonationReferrals),
                EstimatedDonationValuePhp = group.Sum(x => x.EstimatedDonationValuePhp)
            })
            .ToListAsync())
            .OrderByDescending(x => x.TotalDonationReferrals)
            .Select(x => new PlatformPerformanceDto(
                x.Key,
                x.AverageEngagementRate,
                x.TotalDonationReferrals,
                x.EstimatedDonationValuePhp))
            .ToList();

        var recentPosts = await dbContext.SocialMediaPosts
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(8)
            .Select(x => new OutreachPerformanceRowDto(
                x.Platform,
                x.PostType,
                x.EngagementRate,
                x.DonationReferrals,
                x.EstimatedDonationValuePhp))
            .ToListAsync();

        return Ok(new OutreachPerformanceResponse(platformSummaries, recentPosts));
    }
}
