using Intex.Api.DTOs;

namespace Intex.Api.Services;

public interface IJwtTokenService
{
    Task<AuthResponse> CreateAuthResponseAsync(ApplicationUser user);
}
