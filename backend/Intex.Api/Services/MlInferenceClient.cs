using System.Net.Http.Json;
using Intex.Api.DTOs;
using Intex.Api.Infrastructure;
using Intex.Api.Models.Options;
using Microsoft.Extensions.Options;

namespace Intex.Api.Services;

public class MlInferenceClient(
    HttpClient httpClient,
    IOptions<MlInferenceOptions> mlOptions,
    ILogger<MlInferenceClient> logger) : IMlInferenceClient
{
    private readonly MlInferenceOptions options = mlOptions.Value;

    public async Task<ReintegrationPredictionResponse> PredictReintegrationAsync(
        ReintegrationFeaturePayload features,
        CancellationToken cancellationToken = default)
    {
        var request = new ReintegrationPredictionRequest(features);
        try
        {
            using var response = await httpClient.PostAsJsonAsync(options.ReintegrationEndpoint, request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                var payload = await response.Content.ReadFromJsonAsync<ReintegrationPredictionResponse>(cancellationToken: cancellationToken);
                if (payload is not null)
                {
                    return payload with { Source = "remote-inference-service" };
                }
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning(
                "Reintegration inference failed with status {StatusCode}. Body: {Body}",
                (int)response.StatusCode,
                body);

            if (!options.EnableLocalFallback)
            {
                throw new HttpProblemException(
                    StatusCodes.Status503ServiceUnavailable,
                    "ML inference unavailable",
                    "The reintegration scoring service is temporarily unavailable.",
                    options.ReintegrationEndpoint);
            }
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(exception, "Reintegration inference request timed out.");
            if (!options.EnableLocalFallback)
            {
                throw new HttpProblemException(
                    StatusCodes.Status504GatewayTimeout,
                    "ML inference timed out",
                    "The reintegration scoring service did not respond in time.",
                    options.ReintegrationEndpoint,
                    exception);
            }
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Failed reaching remote reintegration inference endpoint.");
            if (!options.EnableLocalFallback)
            {
                throw new HttpProblemException(
                    StatusCodes.Status503ServiceUnavailable,
                    "ML inference unavailable",
                    "The reintegration scoring service could not be reached.",
                    options.ReintegrationEndpoint,
                    exception);
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed calling remote reintegration inference endpoint.");
            if (!options.EnableLocalFallback)
            {
                throw new HttpProblemException(
                    StatusCodes.Status503ServiceUnavailable,
                    "ML inference unavailable",
                    "The reintegration scoring service failed unexpectedly.",
                    options.ReintegrationEndpoint,
                    exception);
            }
        }

        if (!options.EnableLocalFallback)
        {
            throw new HttpProblemException(
                StatusCodes.Status503ServiceUnavailable,
                "ML inference unavailable",
                "The reintegration scoring service is unavailable and local fallback is disabled.",
                options.ReintegrationEndpoint);
        }

        return BuildFallbackPrediction(features);
    }

    private static ReintegrationPredictionResponse BuildFallbackPrediction(ReintegrationFeaturePayload features)
    {
        var riskRaw =
            0.12m * features.InitialRiskScore +
            0.25m * (features.IncidentCount > 0 ? 1m : 0m) +
            0.15m * features.ConcernsFlaggedRate +
            0.10m * (features.HasSpecialNeeds == 1 ? 1m : 0m) -
            0.12m * features.ProgressNotedRate -
            0.08m * (features.HealthTrend > 0 ? 1m : 0m) -
            0.08m * (features.EducationTrend > 0 ? 1m : 0m);

        var boundedRisk = Math.Clamp(riskRaw, 0m, 1m);
        var positiveProbability = 1m - boundedRisk;

        var factors = new List<string>();
        if (features.IncidentCount > 0) factors.Add("Recent incident volume");
        if (features.HighSeverityIncidentCount > 0) factors.Add("High-severity incidents");
        if (features.ConcernsFlaggedRate >= 0.40m) factors.Add("Frequent counseling concerns");
        if (features.HealthTrend < 0) factors.Add("Negative health trend");
        if (features.EducationTrend < 0) factors.Add("Negative education trend");

        if (factors.Count == 0)
        {
            factors.Add("Stable profile with no major risk spikes");
        }

        var recommendation = boundedRisk >= 0.65m
            ? "Escalate to multidisciplinary case conference and weekly monitoring."
            : boundedRisk >= 0.40m
                ? "Maintain biweekly social-worker follow-up and targeted intervention plans."
                : "Continue standard plan cadence and monitor monthly.";

        return new ReintegrationPredictionResponse(
            features.ResidentId,
            boundedRisk,
            positiveProbability,
            factors.Take(3).ToList(),
            recommendation,
            "fallback-v1",
            DateTime.UtcNow,
            "local-fallback");
    }
}
