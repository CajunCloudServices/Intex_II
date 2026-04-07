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

        var monthlyTrends = (await dbContext.SafehouseMonthlyMetrics
            .Include(x => x.Safehouse)
            .OrderBy(x => x.SafehouseId)
            .ThenBy(x => x.MonthStart)
            .ToListAsync())
            .GroupBy(x => new { x.SafehouseId, x.Safehouse!.Name })
            .Select(group => new SafehouseTrendRowDto(
                group.Key.SafehouseId,
                group.Key.Name,
                group.Select(m => new SafehouseMonthlyTrendPointDto(
                    m.MonthStart,
                    m.ActiveResidents,
                    m.AvgEducationProgress,
                    m.AvgHealthScore,
                    m.ProcessRecordingCount,
                    m.HomeVisitationCount,
                    m.IncidentCount))
                .ToList()))
            .ToList();

        return Ok(new SafehousePerformanceResponse(safehouses, monthlyTrends));
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

    [HttpGet("social-analytics")]
    public async Task<ActionResult<SocialAnalyticsResponse>> GetSocialAnalytics()
    {
        // TODO: Add optional ?platform=&type=&from=&to=&page=&pageSize= query params when post volumes grow.
        var posts = await dbContext.SocialMediaPosts
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        var totals = new SocialAnalyticsTotalsDto(
            posts.Count,
            posts.Sum(x => x.Impressions),
            posts.Sum(x => x.Reach),
            posts.Sum(x => x.DonationReferrals),
            posts.Sum(x => x.EstimatedDonationValuePhp),
            posts.Count > 0 ? posts.Average(x => x.EngagementRate) : 0m);

        var platformSummaries = posts
            .GroupBy(x => x.Platform)
            .OrderByDescending(x => x.Sum(p => p.DonationReferrals))
            .Select(group => new PlatformPerformanceDto(
                group.Key,
                group.Average(x => x.EngagementRate),
                group.Sum(x => x.DonationReferrals),
                group.Sum(x => x.EstimatedDonationValuePhp)))
            .ToList();

        var postDetails = posts.Select(x => new SocialPostDetailDto(
            x.Id,
            x.Platform,
            x.PostType,
            x.Caption,
            x.CreatedAtUtc,
            x.CampaignName,
            x.Impressions,
            x.Reach,
            x.Likes,
            x.Comments,
            x.Shares,
            x.ClickThroughs,
            x.EngagementRate,
            x.DonationReferrals,
            x.EstimatedDonationValuePhp,
            x.IsBoosted))
            .ToList();

        return Ok(new SocialAnalyticsResponse(totals, platformSummaries, postDetails));
    }

    [HttpPost("social-post-advisor")]
    public async Task<ActionResult<SocialPostAdvisorResponseDto>> PredictSocialPostConversion(SocialPostAdvisorRequestDto request)
    {
        var posts = await dbContext.SocialMediaPosts.AsNoTracking().ToListAsync();
        if (posts.Count == 0)
        {
            return Ok(new SocialPostAdvisorResponseDto(
                0m,
                0m,
                [],
                "No social post history is available yet. Add post records before using the advisor."));
        }

        var baseline = posts.Average(x => x.EstimatedDonationValuePhp);
        var hasCallToActionBoost = posts
            .Where(x => x.HasCallToAction)
            .Select(x => x.EstimatedDonationValuePhp)
            .DefaultIfEmpty((decimal)baseline)
            .Average() - baseline;
        var residentStoryBoost = posts
            .Where(x => x.FeaturesResidentStory)
            .Select(x => x.EstimatedDonationValuePhp)
            .DefaultIfEmpty((decimal)baseline)
            .Average() - baseline;

        var platformBoost = posts
            .Where(x => x.Platform == request.Platform)
            .Select(x => x.EstimatedDonationValuePhp)
            .DefaultIfEmpty((decimal)baseline)
            .Average() - baseline;
        var postTypeBoost = posts
            .Where(x => x.PostType == request.PostType)
            .Select(x => x.EstimatedDonationValuePhp)
            .DefaultIfEmpty((decimal)baseline)
            .Average() - baseline;
        var mediaTypeBoost = posts
            .Where(x => x.MediaType == request.MediaType)
            .Select(x => x.EstimatedDonationValuePhp)
            .DefaultIfEmpty((decimal)baseline)
            .Average() - baseline;
        var sentimentBoost = posts
            .Where(x => x.SentimentTone == request.SentimentTone)
            .Select(x => x.EstimatedDonationValuePhp)
            .DefaultIfEmpty((decimal)baseline)
            .Average() - baseline;

        // Keep this deterministic and transparent for staff use.
        var hourAdjustment = request.PostHour switch
        {
            >= 18 and <= 21 => 120m,
            >= 11 and <= 14 => 40m,
            _ => -20m
        };

        var hashtagAdjustment = Math.Clamp(request.NumHashtags, 0, 8) * 15m;
        var callToActionAdjustment = request.HasCallToAction ? hasCallToActionBoost : -Math.Abs(hasCallToActionBoost) * 0.5m;
        var storyAdjustment = request.FeaturesResidentStory ? residentStoryBoost : -Math.Abs(residentStoryBoost) * 0.4m;
        var boostBudgetAdjustment = request.IsBoosted ? Math.Min(request.BoostBudgetPhp * 0.08m, 300m) : 0m;

        var predicted = Math.Max(
            0m,
            baseline + platformBoost + postTypeBoost + mediaTypeBoost + sentimentBoost +
            hourAdjustment + hashtagAdjustment + callToActionAdjustment + storyAdjustment + boostBudgetAdjustment);

        var contributions = new List<SocialPostAdvisorFeatureContributionDto>
        {
            new("Platform", Math.Round(platformBoost, 2)),
            new("Post type", Math.Round(postTypeBoost, 2)),
            new("Media type", Math.Round(mediaTypeBoost, 2)),
            new("Sentiment", Math.Round(sentimentBoost, 2)),
            new("Posting hour", Math.Round(hourAdjustment, 2)),
            new("Hashtags", Math.Round(hashtagAdjustment, 2)),
            new("Call to action", Math.Round(callToActionAdjustment, 2)),
            new("Resident story", Math.Round(storyAdjustment, 2)),
            new("Boost budget", Math.Round(boostBudgetAdjustment, 2)),
        }
            .OrderByDescending(x => Math.Abs(x.EffectAmountPhp))
            .Take(5)
            .ToList();

        return Ok(new SocialPostAdvisorResponseDto(
            Math.Round(predicted, 2),
            Math.Round((decimal)baseline, 2),
            contributions,
            "Prediction is a historical pattern estimate using pre-post features only. Validate high-impact recommendations with controlled tests."));
    }

    [HttpGet("counseling-risk")]
    public async Task<ActionResult<CounselingRiskSummaryResponse>> GetCounselingRiskSummary([FromQuery] int top = 15)
    {
        var recordings = await dbContext.ProcessRecordings
            .AsNoTracking()
            .Include(x => x.Resident)
            .OrderByDescending(x => x.SessionDate)
            .ToListAsync();

        if (recordings.Count == 0)
        {
            return Ok(new CounselingRiskSummaryResponse(0, 0, 0, 0, []));
        }

        var rows = recordings.Select(recording =>
        {
            var probability =
                0.14m +
                (recording.ConcernsFlagged ? 0.40m : 0m) +
                (recording.ReferralMade ? 0.18m : 0m) -
                (recording.ProgressNoted ? 0.16m : 0m) +
                (recording.SessionDurationMinutes >= 90 ? 0.08m : 0m) +
                (recording.SessionType.Equals("Crisis", StringComparison.OrdinalIgnoreCase) ? 0.16m : 0m);

            var boundedProbability = Math.Clamp(probability, 0.01m, 0.99m);
            var tier = boundedProbability >= 0.70m ? "High"
                : boundedProbability >= 0.40m ? "Medium"
                : "Low";
            var factor = recording.ConcernsFlagged ? "Concerns flagged in session"
                : recording.ReferralMade ? "Referral raised"
                : recording.SessionType.Equals("Crisis", StringComparison.OrdinalIgnoreCase) ? "Crisis session type"
                : "Baseline counseling profile";

            return new CounselingRiskRowDto(
                recording.Id,
                recording.ResidentId,
                recording.Resident?.CaseControlNumber ?? $"Resident {recording.ResidentId}",
                recording.SessionDate,
                recording.SessionType,
                Math.Round(boundedProbability, 4),
                tier,
                factor);
        })
            .OrderByDescending(x => x.ConcernProbability)
            .ToList();

        return Ok(new CounselingRiskSummaryResponse(
            rows.Count,
            rows.Count(x => x.RiskTier == "High"),
            rows.Count(x => x.RiskTier == "Medium"),
            rows.Count(x => x.RiskTier == "Low"),
            rows.Take(Math.Clamp(top, 1, 50)).ToList()));
    }
}
