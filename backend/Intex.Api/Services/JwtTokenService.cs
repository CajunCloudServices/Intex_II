using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Intex.Api.DTOs;
using Intex.Api.Models.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Intex.Api.Services;

public class JwtTokenService(
    UserManager<ApplicationUser> userManager,
    IOptions<JwtOptions> jwtOptions) : IJwtTokenService
{
    public async Task<AuthResponse> CreateAuthResponseAsync(ApplicationUser user)
    {
        var options = jwtOptions.Value;
        var roles = await userManager.GetRolesAsync(user);
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(options.ExpirationMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        if (user.SupporterId.HasValue)
        {
            claims.Add(new Claim("supporter_id", user.SupporterId.Value.ToString()));
        }

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        var encodedToken = new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponse(
            encodedToken,
            expiresAtUtc,
            new UserProfileDto(user.Id, user.Email ?? string.Empty, user.FullName, roles.ToArray(), user.SupporterId));
    }
}
