using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class MlController(
    ApplicationDbContext dbContext,
    IReintegrationFeatureBuilder featureBuilder,
    IMlInferenceClient inferenceClient) : ControllerBase
{
    [HttpGet("reintegration-features/{residentId:int}")]
    public async Task<ActionResult<ReintegrationFeaturePayload>> GetReintegrationFeatures(
        int residentId,
        CancellationToken cancellationToken)
    {
        var features = await featureBuilder.BuildAsync(residentId, cancellationToken);
        return features is null ? NotFound() : Ok(features);
    }

    [HttpGet("reintegration-risk/{residentId:int}")]
    public async Task<ActionResult<ReintegrationPredictionResponse>> GetReintegrationRisk(
        int residentId,
        CancellationToken cancellationToken)
    {
        var features = await featureBuilder.BuildAsync(residentId, cancellationToken);
        if (features is null)
        {
            return NotFound();
        }

        var prediction = await inferenceClient.PredictReintegrationAsync(features, cancellationToken);
        return Ok(prediction);
    }

    [HttpGet("reintegration-risk-summary")]
    public async Task<ActionResult<ReintegrationRiskSummaryResponse>> GetReintegrationRiskSummary(
        [FromQuery] int top = 12,
        CancellationToken cancellationToken = default)
    {
        var residents = await dbContext.Residents
            .AsNoTracking()
            .Where(x => x.CaseStatus == "Active")
            .OrderBy(x => x.Id)
            .ToListAsync(cancellationToken);

        if (residents.Count == 0)
        {
            return Ok(new ReintegrationRiskSummaryResponse(0, 0, 0, 0, []));
        }

        var rows = new List<ReintegrationRiskRowDto>(residents.Count);
        foreach (var resident in residents)
        {
            var features = await featureBuilder.BuildAsync(resident.Id, cancellationToken);
            if (features is null)
            {
                continue;
            }

            var prediction = await inferenceClient.PredictReintegrationAsync(features, cancellationToken);
            rows.Add(new ReintegrationRiskRowDto(
                resident.Id,
                resident.CaseControlNumber,
                prediction.RiskScore,
                prediction.PositiveProbability,
                prediction.RecommendedAction,
                prediction.TopRiskFactors));
        }

        var ordered = rows.OrderByDescending(x => x.RiskScore).ToList();
        return Ok(new ReintegrationRiskSummaryResponse(
            ordered.Count,
            ordered.Count(x => x.RiskScore >= 0.65m),
            ordered.Count(x => x.RiskScore >= 0.40m && x.RiskScore < 0.65m),
            ordered.Count(x => x.RiskScore < 0.40m),
            ordered.Take(Math.Clamp(top, 1, 50)).ToList()));
    }
}
