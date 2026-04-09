using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public-impact")]
[AllowAnonymous]
public class PublicImpactController(ApplicationDbContext dbContext, ILogger<PublicImpactController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PublicImpactDashboardResponse>> GetPublished()
    {
        var snapshotEntities = await dbContext.PublicImpactSnapshots
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.SnapshotDate)
            .ToListAsync();

        var homeVisitsByMonth = await dbContext.SafehouseMonthlyMetrics
            .GroupBy(x => x.MonthStart)
            .Select(group => new
            {
                MonthStart = group.Key,
                HomeVisits = group.Sum(x => x.HomeVisitationCount)
            })
            .ToDictionaryAsync(x => x.MonthStart, x => x.HomeVisits);

        var snapshots = snapshotEntities
            .Select(x =>
            {
                var metrics = DeserializeMetrics(x);
                return new PublicImpactSnapshotResponse(
                    x.Id,
                    x.SnapshotDate,
                    x.Headline,
                    x.SummaryText,
                    metrics.TotalResidents,
                    metrics.AvgHealthScore,
                    metrics.AvgEducationProgress,
                    metrics.DonationsTotalForMonth,
                    homeVisitsByMonth.GetValueOrDefault(x.SnapshotDate),
                    IsDisplayValid(metrics));
            })
            .ToList();

        var totalAllocated = await dbContext.DonationAllocations.SumAsync(x => x.AmountAllocated);
        var resourceUse = (await dbContext.DonationAllocations
            .GroupBy(x => x.ProgramArea)
            .Select(group => new
            {
                ProgramArea = group.Key,
                AmountAllocated = group.Sum(x => x.AmountAllocated)
            })
            .OrderByDescending(x => x.AmountAllocated)
            .ToListAsync())
            .Select(x => new PublicImpactResourceUseItemDto(
                x.ProgramArea,
                x.AmountAllocated,
                totalAllocated <= 0m ? 0m : Math.Round((x.AmountAllocated / totalAllocated) * 100m, 1)))
            .ToList();

        var capacityRows = await dbContext.Safehouses
            .OrderBy(x => x.Name)
            .Select(x => new PublicImpactCapacityRowDto(
                x.Name,
                x.CurrentOccupancy,
                x.CapacityGirls))
            .ToListAsync();

        var latestValidSnapshotDate = snapshots
            .Where(x => x.IsDisplayValid)
            .OrderByDescending(x => x.SnapshotDate)
            .Select(x => (DateOnly?)x.SnapshotDate)
            .FirstOrDefault();

        var homeVisitMonth = latestValidSnapshotDate ??
            await dbContext.SafehouseMonthlyMetrics
                .OrderByDescending(x => x.MonthStart)
                .Select(x => (DateOnly?)x.MonthStart)
                .FirstOrDefaultAsync();

        var homeVisitsThisMonth = homeVisitMonth.HasValue
            ? await dbContext.SafehouseMonthlyMetrics
                .Where(x => x.MonthStart == homeVisitMonth.Value)
                .SumAsync(x => x.HomeVisitationCount)
            : 0;

        var totalHomeVisitsRecorded = await dbContext.SafehouseMonthlyMetrics
            .SumAsync(x => x.HomeVisitationCount);

        return Ok(new PublicImpactDashboardResponse(
            snapshots,
            resourceUse,
            capacityRows,
            new PublicImpactSummaryDto(
                capacityRows.Sum(x => x.CurrentOccupancy),
                capacityRows.Sum(x => x.CapacityGirls),
                capacityRows.Count,
                homeVisitsThisMonth,
                homeVisitMonth),
            new PublicImpactOverallSummaryDto(
                totalAllocated,
                totalHomeVisitsRecorded,
                capacityRows.Count,
                snapshots.Count(x => x.IsDisplayValid),
                capacityRows.Sum(x => x.CurrentOccupancy),
                capacityRows.Sum(x => x.CapacityGirls))));
    }

    private bool IsDisplayValid(PublicImpactSnapshotMetrics metrics)
    {
        if (!metrics.TotalResidents.HasValue || metrics.TotalResidents <= 0)
        {
            return false;
        }

        return (metrics.AvgHealthScore ?? 0m) > 0m || (metrics.AvgEducationProgress ?? 0m) > 0m;
    }

    private PublicImpactSnapshotMetrics DeserializeMetrics(Entities.PublicImpactSnapshot snapshot)
    {
        if (string.IsNullOrWhiteSpace(snapshot.MetricPayloadJson))
        {
            return new PublicImpactSnapshotMetrics(null, null, null, null);
        }

        try
        {
            using var document = JsonDocument.Parse(snapshot.MetricPayloadJson);
            var root = document.RootElement;

            if (root.ValueKind == JsonValueKind.Object)
            {
                return new PublicImpactSnapshotMetrics(
                    TryGetInt(root, "total_residents"),
                    TryGetDecimal(root, "avg_health_score"),
                    TryGetDecimal(root, "avg_education_progress"),
                    TryGetDecimal(root, "donations_total_for_month"));
            }

            if (root.ValueKind == JsonValueKind.Array)
            {
                int? totalResidents = null;
                decimal? avgHealthScore = null;
                decimal? avgEducationProgress = null;
                decimal? donationsTotalForMonth = null;

                foreach (var item in root.EnumerateArray())
                {
                    var label = item.TryGetProperty("label", out var labelElement)
                        ? labelElement.GetString()?.Trim().ToLowerInvariant()
                        : null;
                    var value = item.TryGetProperty("value", out var valueElement)
                        ? valueElement.GetString()
                        : null;

                    if (string.IsNullOrWhiteSpace(label) || string.IsNullOrWhiteSpace(value))
                    {
                        continue;
                    }

                    if (label.Contains("resident"))
                    {
                        totalResidents = ParseInt(value);
                    }
                    else if (label.Contains("health") || label.Contains("wellbeing"))
                    {
                        avgHealthScore = ParseDecimal(value);
                    }
                    else if (label.Contains("education"))
                    {
                        avgEducationProgress = ParseDecimal(value);
                    }
                    else if (label.Contains("donation"))
                    {
                        donationsTotalForMonth = ParseDecimal(value);
                    }
                }

                return new PublicImpactSnapshotMetrics(
                    totalResidents,
                    avgHealthScore,
                    avgEducationProgress,
                    donationsTotalForMonth);
            }

            return new PublicImpactSnapshotMetrics(null, null, null, null);
        }
        catch (JsonException exception)
        {
            logger.LogWarning(
                exception,
                "Skipping invalid public impact metrics for snapshot {SnapshotId} ({SnapshotDate})",
                snapshot.Id,
                snapshot.SnapshotDate);

            return new PublicImpactSnapshotMetrics(null, null, null, null);
        }
    }

    private static int? TryGetInt(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        return property.ValueKind switch
        {
            JsonValueKind.Number when property.TryGetInt32(out var value) => value,
            JsonValueKind.String => ParseInt(property.GetString()),
            _ => null
        };
    }

    private static decimal? TryGetDecimal(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        return property.ValueKind switch
        {
            JsonValueKind.Number when property.TryGetDecimal(out var value) => value,
            JsonValueKind.String => ParseDecimal(property.GetString()),
            _ => null
        };
    }

    private static int? ParseInt(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var cleaned = new string(raw.Where(char.IsDigit).ToArray());
        return int.TryParse(cleaned, out var parsed) ? parsed : null;
    }

    private static decimal? ParseDecimal(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var cleaned = new string(raw.Where(character => char.IsDigit(character) || character is '.' or '-').ToArray());
        return decimal.TryParse(cleaned, out var parsed) ? parsed : null;
    }

    private sealed record PublicImpactSnapshotMetrics(
        int? TotalResidents,
        decimal? AvgHealthScore,
        decimal? AvgEducationProgress,
        decimal? DonationsTotalForMonth);
}
