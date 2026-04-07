using Intex.Api.Authorization;
using Intex.Api.DTOs;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class MlController(
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
}
