using Intex.Api.DTOs;

namespace Intex.Api.Services;

public interface IMlInferenceClient
{
    Task<ReintegrationPredictionResponse> PredictReintegrationAsync(ReintegrationFeaturePayload features, CancellationToken cancellationToken = default);
}
