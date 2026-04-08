using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Intex.Api.Infrastructure;

/// <summary>
/// Adds domain claims (e.g. supporter_id) to the cookie identity so donor-scoped APIs work without JWTs.
/// </summary>
public class ApplicationUserClaimsPrincipalFactory(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IOptions<IdentityOptions> optionsAccessor)
    : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole<Guid>>(userManager, roleManager, optionsAccessor)
{
    public override async Task<ClaimsPrincipal> CreateAsync(ApplicationUser user)
    {
        var principal = await base.CreateAsync(user);
        if (user.SupporterId is { } supporterId)
        {
            var identity = (ClaimsIdentity)principal.Identity!;
            identity.AddClaim(new Claim("supporter_id", supporterId.ToString()));
        }

        return principal;
    }
}
