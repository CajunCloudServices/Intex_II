using Intex.Api.Data;
using Intex.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Services;

public class ReintegrationFeatureBuilder(ApplicationDbContext dbContext) : IReintegrationFeatureBuilder
{
    private static readonly Dictionary<string, int> RiskScores = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Low"] = 1,
        ["Medium"] = 2,
        ["High"] = 3,
        ["Critical"] = 4
    };

    public async Task<ReintegrationFeaturePayload?> BuildAsync(int residentId, CancellationToken cancellationToken = default)
    {
        var resident = await dbContext.Residents
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == residentId, cancellationToken);

        if (resident is null)
        {
            return null;
        }

        var healthRecords = await dbContext.HealthWellbeingRecords
            .AsNoTracking()
            .Where(x => x.ResidentId == residentId)
            .OrderBy(x => x.RecordDate)
            .ToListAsync(cancellationToken);

        var educationRecords = await dbContext.EducationRecords
            .AsNoTracking()
            .Where(x => x.ResidentId == residentId)
            .OrderBy(x => x.RecordDate)
            .ToListAsync(cancellationToken);

        var processRecords = await dbContext.ProcessRecordings
            .AsNoTracking()
            .Where(x => x.ResidentId == residentId)
            .OrderBy(x => x.SessionDate)
            .ToListAsync(cancellationToken);

        var incidentRecords = await dbContext.IncidentReports
            .AsNoTracking()
            .Where(x => x.ResidentId == residentId)
            .ToListAsync(cancellationToken);

        var avgHealthScore = healthRecords.Count > 0 ? healthRecords.Average(x => x.GeneralHealthScore) : 0m;
        var healthTrend = healthRecords.Count > 1
            ? healthRecords[^1].GeneralHealthScore - healthRecords[0].GeneralHealthScore
            : 0m;

        var avgEducationProgress = educationRecords.Count > 0 ? educationRecords.Average(x => x.ProgressPercent) : 0m;
        var educationTrend = educationRecords.Count > 1
            ? educationRecords[^1].ProgressPercent - educationRecords[0].ProgressPercent
            : 0m;

        var sessionCount = processRecords.Count;
        var avgSessionDuration = sessionCount > 0 ? (decimal)processRecords.Average(x => x.SessionDurationMinutes) : 0m;
        var progressNotedRate = sessionCount > 0 ? processRecords.Count(x => x.ProgressNoted) / (decimal)sessionCount : 0m;
        var concernsFlaggedRate = sessionCount > 0 ? processRecords.Count(x => x.ConcernsFlagged) / (decimal)sessionCount : 0m;
        var avgEmotionShift = sessionCount > 0
            ? (decimal)processRecords.Average(x => MapEmotion(x.EmotionalStateEnd) - MapEmotion(x.EmotionalStateObserved))
            : 0m;

        var incidentCount = incidentRecords.Count;
        var highSeverityIncidentCount = incidentRecords.Count(x => string.Equals(x.Severity, "High", StringComparison.OrdinalIgnoreCase));

        return new ReintegrationFeaturePayload(
            resident.Id,
            RiskScores.GetValueOrDefault(resident.InitialRiskLevel, 0),
            resident.IsTrafficked ? 1 : 0,
            resident.IsPhysicalAbuseCase ? 1 : 0,
            resident.IsSexualAbuseCase ? 1 : 0,
            resident.HasSpecialNeeds ? 1 : 0,
            resident.FamilyIs4Ps ? 1 : 0,
            resident.FamilySoloParent ? 1 : 0,
            resident.FamilyInformalSettler ? 1 : 0,
            avgHealthScore,
            healthTrend,
            avgEducationProgress,
            educationTrend,
            sessionCount,
            avgSessionDuration,
            avgEmotionShift,
            progressNotedRate,
            concernsFlaggedRate,
            incidentCount,
            highSeverityIncidentCount);
    }

    private static int MapEmotion(string emotion) =>
        emotion.Trim().ToLowerInvariant() switch
        {
            "distressed" => 1,
            "angry" => 2,
            "sad" => 3,
            "withdrawn" => 4,
            "anxious" => 5,
            "calm" => 6,
            "hopeful" => 7,
            "happy" => 8,
            _ => 0
        };
}
