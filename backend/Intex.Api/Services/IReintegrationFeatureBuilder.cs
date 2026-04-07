using Intex.Api.DTOs;

namespace Intex.Api.Services;

public interface IReintegrationFeatureBuilder
{
    Task<ReintegrationFeaturePayload?> BuildAsync(int residentId, CancellationToken cancellationToken = default);
}
