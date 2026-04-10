using System.ComponentModel.DataAnnotations;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.StaffOrAdmin)]
[EnableRateLimiting("reports-heavy")]
public class ReportsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("donation-trends")]
    public async Task<ActionResult<DonationTrendsResponse>> GetDonationTrends()
    {
        var monthlyRows = await dbContext.Donations
            .AsNoTracking()
            .GroupBy(x => new { x.DonationDate.Year, x.DonationDate.Month })
            .Select(group => new
            {
                group.Key.Year,
                group.Key.Month,
                Total = group.Sum(x => x.Amount ?? x.EstimatedValue),
                Count = group.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync();

        var totals = monthlyRows
            .Select(x => new DonationTrendPointDto(
                $"{x.Year}-{x.Month:D2}",
                x.Total,
                x.Count))
            .ToList();

        var contributionMix = (await dbContext.Donations
            .AsNoTracking()
            .GroupBy(x => x.DonationType)
            .Select(group => new ContributionMixDto(
                group.Key,
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToListAsync())
            .OrderByDescending(x => x.TotalAmount)
            .ToList();

        var campaignSummaries = (await dbContext.Donations
            .AsNoTracking()
            .Where(x => !string.IsNullOrWhiteSpace(x.CampaignName))
            .GroupBy(x => x.CampaignName!)
            .Select(group => new CampaignSummaryDto(
                group.Key,
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToListAsync())
            .OrderByDescending(x => x.TotalAmount)
            .ToList();

        var channelSummaries = (await dbContext.Donations
            .AsNoTracking()
            .GroupBy(x => x.ChannelSource)
            .Select(group => new ChannelSummaryDto(
                group.Key,
                group.Sum(x => x.Amount ?? x.EstimatedValue),
                group.Count()))
            .ToListAsync())
            .OrderByDescending(x => x.TotalAmount)
            .ToList();

        var recurring = await dbContext.Donations.AsNoTracking().CountAsync(x => x.IsRecurring);
        var oneTime = await dbContext.Donations.AsNoTracking().CountAsync(x => !x.IsRecurring);

        return Ok(new DonationTrendsResponse(
            totals,
            recurring,
            oneTime,
            contributionMix,
            campaignSummaries,
            channelSummaries));
    }

    [HttpGet("resident-outcomes")]
    public async Task<ActionResult<ResidentOutcomesResponse>> GetResidentOutcomes()
    {
        var interventionStatuses = (await dbContext.InterventionPlans
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var riskDistribution = (await dbContext.Residents
            .AsNoTracking()
            .GroupBy(x => x.CurrentRiskLevel)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var reintegrationStatuses = (await dbContext.Residents
            .AsNoTracking()
            .Where(x => x.ReintegrationStatus != null)
            .GroupBy(x => x.ReintegrationStatus!)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var progressSummary = new ProcessRecordingSummaryDto(
            await dbContext.ProcessRecordings.AsNoTracking().CountAsync(x => x.ProgressNoted),
            await dbContext.ProcessRecordings.AsNoTracking().CountAsync(x => x.ConcernsFlagged),
            await dbContext.ProcessRecordings.AsNoTracking().CountAsync(x => x.ReferralMade));

        var followUpBurden = new FollowUpBurdenDto(
            await dbContext.HomeVisitations.AsNoTracking().CountAsync(x => x.FollowUpNeeded),
            await dbContext.IncidentReports.AsNoTracking().CountAsync(x => !x.Resolved),
            await dbContext.Residents.AsNoTracking().CountAsync(x => x.CurrentRiskLevel == "High" || x.CurrentRiskLevel == "Critical"));

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
            .AsNoTracking()
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
            .AsNoTracking()
            .Include(x => x.Safehouse)
            .OrderBy(x => x.SafehouseId)
            .ThenBy(x => x.MonthStart)
            .ToListAsync())
            // Group in memory so each trend row can preserve chronological points for a single safehouse.
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
            .AsNoTracking()
            .Where(x => x.ReintegrationStatus != null)
            .GroupBy(x => x.ReintegrationStatus!)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync())
            .OrderByDescending(x => x.Count)
            .Select(x => new BreakdownItemDto(x.Key, x.Count))
            .ToList();

        var types = (await dbContext.Residents
            .AsNoTracking()
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
            await dbContext.Residents.AsNoTracking().CountAsync(x => x.CaseStatus == "Closed"),
            await dbContext.Residents.AsNoTracking().CountAsync(x => x.CaseStatus == "Active")));
    }

    [HttpGet("outreach-performance")]
    public async Task<ActionResult<OutreachPerformanceResponse>> GetOutreachPerformance()
    {
        var platformSummaries = (await dbContext.SocialMediaPosts
            .AsNoTracking()
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
            .AsNoTracking()
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
    public async Task<ActionResult<SocialAnalyticsResponse>> GetSocialAnalytics(
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 25)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var totalPosts = await dbContext.SocialMediaPosts.AsNoTracking().CountAsync();

        var totals = new SocialAnalyticsTotalsDto(
            totalPosts,
            await dbContext.SocialMediaPosts.AsNoTracking().SumAsync(x => x.Impressions),
            await dbContext.SocialMediaPosts.AsNoTracking().SumAsync(x => x.Reach),
            await dbContext.SocialMediaPosts.AsNoTracking().SumAsync(x => x.DonationReferrals),
            await dbContext.SocialMediaPosts.AsNoTracking().SumAsync(x => x.EstimatedDonationValuePhp),
            totalPosts == 0
                ? 0m
                : await dbContext.SocialMediaPosts.AsNoTracking().AverageAsync(x => x.EngagementRate));

        var platformSummaries = (await dbContext.SocialMediaPosts
            .AsNoTracking()
            .GroupBy(x => x.Platform)
            .Select(group => new PlatformPerformanceDto(
                group.Key,
                group.Average(x => x.EngagementRate),
                group.Sum(x => x.DonationReferrals),
                group.Sum(x => x.EstimatedDonationValuePhp)))
            .ToListAsync())
            .OrderByDescending(x => x.TotalDonationReferrals)
            .ToList();

        var postDetails = await dbContext.SocialMediaPosts
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new SocialPostDetailDto(
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
            .ToListAsync();

        return Ok(new SocialAnalyticsResponse(totals, platformSummaries, postDetails, page, pageSize, totalPosts));
    }

    [HttpGet("trend-deployments")]
    public async Task<ActionResult<TrendDeploymentSummaryResponse>> GetTrendDeployments()
    {
        var socialImpactStoryPosts = await dbContext.SocialMediaPosts
            .AsNoTracking()
            .Where(x => x.PostType == "ImpactStory")
            .ToListAsync();
        var socialImpactStoryReferralRate = socialImpactStoryPosts.Count == 0
            ? 0m
            : socialImpactStoryPosts.Average(x => (decimal)x.DonationReferrals);

        var donations = await dbContext.Donations.AsNoTracking().ToListAsync();
        var totalDonationAmount = donations.Sum(x => x.Amount ?? x.EstimatedValue);
        var q4DonationAmount = donations
            .Where(x => x.DonationDate.Month is 10 or 11 or 12)
            .Sum(x => x.Amount ?? x.EstimatedValue);
        var q4Share = totalDonationAmount <= 0m ? 0m : q4DonationAmount / totalDonationAmount;

        var monthlyMetrics = await dbContext.SafehouseMonthlyMetrics.AsNoTracking().ToListAsync();
        var avgIncidentRate = monthlyMetrics.Count == 0
            ? 0m
            : monthlyMetrics.Average(x => x.ActiveResidents > 0 ? (decimal)x.IncidentCount / x.ActiveResidents : 0m);

        var processRecordings = await dbContext.ProcessRecordings.AsNoTracking().ToListAsync();
        var concernRate = processRecordings.Count == 0
            ? 0m
            : (decimal)processRecordings.Count(x => x.ConcernsFlagged) / processRecordings.Count;

        var incidents = await dbContext.IncidentReports.AsNoTracking().ToListAsync();
        var highSeverityRate = incidents.Count == 0
            ? 0m
            : (decimal)incidents.Count(x => x.Severity == "High" || x.Severity == "Critical") / incidents.Count;

        var residents = await dbContext.Residents.AsNoTracking().ToListAsync();
        var positiveTrajectoryRate = residents.Count == 0
            ? 0m
            : (decimal)residents.Count(x =>
                x.ReintegrationStatus == "Completed" ||
                x.ReintegrationStatus == "In Progress" ||
                (x.InitialRiskLevel == "High" && x.CurrentRiskLevel is "Medium" or "Low") ||
                (x.InitialRiskLevel == "Critical" && x.CurrentRiskLevel != "Critical")) / residents.Count;

        var rows = new List<TrendDeploymentRowDto>
        {
            new(
                "social-content-mix-efficiency",
                "Which content/media/platform combinations maximize referrals and value per post?",
                "/api/reports/trend-deployments#social-content-mix-efficiency",
                "Reports & analytics -> Trend deployment scorecards",
                "Avg referrals per ImpactStory post",
                Math.Round(socialImpactStoryReferralRate, 3),
                "Prioritize high-referral post mixes and validate with controlled posting experiments."),
            new(
                "campaign-timing-seasonality",
                "When should campaigns run to maximize donation volume and amount?",
                "/api/reports/trend-deployments#campaign-timing-seasonality",
                "Reports & analytics -> Trend deployment scorecards",
                "Share of donation amount in Q4",
                Math.Round(q4Share, 4),
                "Front-load campaign planning for Q4 windows while testing shoulder months for incremental lift."),
            new(
                "safehouse-operational-load-risk",
                "How does operational intensity relate to incident burden per resident?",
                "/api/reports/trend-deployments#safehouse-operational-load-risk",
                "Reports & analytics -> Trend deployment scorecards",
                "Average incidents per resident-month",
                Math.Round(avgIncidentRate, 4),
                "Allocate staffing and visits proactively in months with elevated load-per-resident signals."),
            new(
                "intervention-mix-effectiveness",
                "Which intervention bundles are associated with improved emotional trajectory and fewer escalations?",
                "/api/reports/trend-deployments#intervention-mix-effectiveness",
                "Reports & analytics -> Trend deployment scorecards",
                "Counseling concern flag rate",
                Math.Round(concernRate, 4),
                "Escalate high-risk sessions early and monitor intervention bundle consistency by worker."),
            new(
                "incident-composition-archetypes",
                "Are there recurring incident profiles requiring different prevention playbooks?",
                "/api/reports/trend-deployments#incident-composition-archetypes",
                "Reports & analytics -> Trend deployment scorecards",
                "High-severity incident rate",
                Math.Round(highSeverityRate, 4),
                "Use incident archetype trends to shape prevention drills and supervisor review priorities."),
            new(
                "resident-trajectory-archetypes",
                "Which longitudinal cross-domain patterns align with favorable reintegration progression?",
                "/api/reports/trend-deployments#resident-trajectory-archetypes",
                "Reports & analytics -> Trend deployment scorecards",
                "Estimated positive trajectory rate",
                Math.Round(positiveTrajectoryRate, 4),
                "Prioritize residents below trend thresholds for targeted case conferencing and support.")
        };

        return Ok(new TrendDeploymentSummaryResponse(DateTime.UtcNow, rows));
    }

    [HttpPost("social-post-advisor")]
    public async Task<ActionResult<SocialPostAdvisorResponseDto>> PredictSocialPostConversion(SocialPostAdvisorRequestDto request)
    {
        var posts = await dbContext.SocialMediaPosts.AsNoTracking().OrderBy(x => x.Id).Take(5000).ToListAsync();
        if (posts.Count == 0)
        {
            return Ok(new SocialPostAdvisorResponseDto(
                0m,
                0m,
                [],
                "No social post history is available yet. Add post records before using the advisor."));
        }

        // Use a simple additive baseline so staff can reason about the output and compare it with real campaign tests.
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
    public async Task<ActionResult<CounselingRiskSummaryResponse>> GetCounselingRiskSummary([FromQuery, Range(1, 50)] int top = 15)
    {
        var recordings = await dbContext.ProcessRecordings
            .AsNoTracking()
            .Include(x => x.Resident)
            .OrderByDescending(x => x.SessionDate)
            .Take(4000)
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
