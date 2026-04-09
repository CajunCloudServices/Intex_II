using System.Security.Claims;
using Intex.Api.Authorization;
using Intex.Api.DTOs;
using Intex.Api.Data;
using Intex.Api.Entities;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IConfiguration configuration,
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    MfaService mfaService) : ControllerBase
{
    private const string GoogleCallbackRoute = "/login/google/callback";

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: false, lockoutOnFailure: true);

        if (result.RequiresTwoFactor)
        {
            var problem = new ProblemDetails
            {
                Detail = "Two-factor authentication required.",
                Status = StatusCodes.Status401Unauthorized
            };
            problem.Extensions["errors"] = new[] { "2FA_REQUIRED" };
            return StatusCode(StatusCodes.Status401Unauthorized, problem);
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(new AuthResponse(await MapUserProfileAsync(user)));
    }

    [HttpPost("register")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var requestedRoles = request.Roles?
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .Select(role => role.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (requestedRoles is null || requestedRoles.Length == 0)
        {
            requestedRoles = string.IsNullOrWhiteSpace(request.Role)
                ? []
                : [request.Role.Trim()];
        }

        if (requestedRoles.Length == 0)
        {
            return BadRequest(new { message = "At least one role is required." });
        }

        if (requestedRoles.Any(role => !RoleNames.All.Contains(role)))
        {
            return BadRequest(new { message = "Unsupported role." });
        }

        var includesDonorRole = requestedRoles.Contains(RoleNames.Donor);

        if (includesDonorRole && !request.SupporterId.HasValue)
        {
            return BadRequest(new { message = "Donor accounts require a supporterId." });
        }

        if (!includesDonorRole && request.SupporterId.HasValue)
        {
            return BadRequest(new { message = "Only accounts with the donor role may link a supporterId." });
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            EmailConfirmed = true,
            SupporterId = request.SupporterId
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors.Select(x => x.Description) });
        }

        foreach (var role in requestedRoles)
        {
            await userManager.AddToRoleAsync(user, role);
        }

        // Do not sign in as the new user — the admin's cookie session must remain active.
        return Created("/api/auth/me", new AuthResponse(await MapUserProfileAsync(user)));
    }

    [HttpPost("register-donor")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<ActionResult<AuthResponse>> RegisterDonor(PublicDonorRegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var fullName = request.FullName.Trim();
        var region = request.Region.Trim();
        var country = request.Country.Trim();
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

        if (await userManager.FindByEmailAsync(normalizedEmail) is not null)
        {
            return BadRequest(new { message = "An account with that email already exists. Sign in to view your donor dashboard." });
        }

        if (await dbContext.Supporters.AnyAsync(x => x.Email.ToLower() == normalizedEmail))
        {
            return BadRequest(new { message = "A donor record already exists for that email. Sign in to continue." });
        }

        var nameParts = SplitFullName(fullName);
        var supporter = new Supporter
        {
            SupporterType = "MonetaryDonor",
            DisplayName = fullName,
            FirstName = nameParts.firstName,
            LastName = nameParts.lastName,
            RelationshipType = "Donor",
            Region = region,
            Country = country,
            Email = normalizedEmail,
            Phone = phone,
            Status = "Active",
            AcquisitionChannel = "Website",
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Supporters.Add(supporter);
        await dbContext.SaveChangesAsync();

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = normalizedEmail,
            Email = normalizedEmail,
            FullName = fullName,
            EmailConfirmed = true,
            SupporterId = supporter.Id
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            dbContext.Supporters.Remove(supporter);
            await dbContext.SaveChangesAsync();
            return BadRequest(new { errors = createResult.Errors.Select(x => x.Description) });
        }

        await userManager.AddToRoleAsync(user, RoleNames.Donor);
        await signInManager.SignInAsync(user, isPersistent: false);

        return Created("/api/auth/me", new AuthResponse(await MapUserProfileAsync(user)));
    }

    [HttpPost("login/mfa")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<ActionResult<AuthResponse>> LoginMfa(LoginMfaRequest request)
    {
        var sanitizedCode = request.Code.Replace(" ", "").Replace("-", "");
        var result = await signInManager.TwoFactorAuthenticatorSignInAsync(sanitizedCode, isPersistent: false, rememberClient: false);

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid or expired verification code." });
        }

        // ASP.NET Identity doesn't return the user object directly from TwoFactorAuthenticatorSignInAsync, so we must retrieve it.
        var user = await signInManager.GetTwoFactorAuthenticationUserAsync() ?? await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { message = "Failed to establish user identity." });
        }

        return Ok(new AuthResponse(await MapUserProfileAsync(user)));
    }

    [HttpPost("mfa/setup")]
    [Authorize]
    public async Task<ActionResult<MfaSetupResponse>> SetupMfa()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var response = await mfaService.BuildSetupResponseAsync(user);
        return Ok(response);
    }

    [HttpPost("mfa/verify")]
    [Authorize]
    public async Task<IActionResult> VerifyMfa(MfaVerifyRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        var sanitizedCode = request.Code.Replace(" ", "").Replace("-", "");
        var isValid = await userManager.VerifyTwoFactorTokenAsync(
            user,
            userManager.Options.Tokens.AuthenticatorTokenProvider,
            sanitizedCode);

        if (!isValid)
        {
            return BadRequest(new { message = "Invalid verification code." });
        }

        await userManager.SetTwoFactorEnabledAsync(user, true);
        return Ok(new { message = "MFA enabled." });
    }

    [HttpPost("mfa/disable")]
    [Authorize]
    public async Task<IActionResult> DisableMfa()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        await userManager.SetTwoFactorEnabledAsync(user, false);
        await userManager.ResetAuthenticatorKeyAsync(user);
        return Ok(new { message = "MFA disabled." });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> Me()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(await MapUserProfileAsync(user));
    }

    [HttpGet("providers")]
    [AllowAnonymous]
    public ActionResult<object> Providers()
    {
        return Ok(new
        {
            googleEnabled = IsGoogleConfigured(configuration)
        });
    }

    [HttpGet("google/login")]
    [AllowAnonymous]
    public IActionResult GoogleLogin([FromQuery] string? returnUrl = null)
    {
        if (!IsGoogleConfigured(configuration))
        {
            return Problem(
                title: "Google sign-in is not configured.",
                detail: "Set the Google client ID and secret on the backend before using Google sign-in.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        var redirectUrl = Url.ActionLink(nameof(GoogleCallback), values: new { returnUrl });
        if (string.IsNullOrWhiteSpace(redirectUrl))
        {
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Unable to start Google sign-in.");
        }

        var properties = signInManager.ConfigureExternalAuthenticationProperties(
            GoogleDefaults.AuthenticationScheme,
            redirectUrl);

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("google/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl = null, [FromQuery] string? remoteError = null)
    {
        if (!string.IsNullOrWhiteSpace(remoteError))
        {
            return Redirect(BuildFrontendGoogleCallbackUrl(returnUrl, error: remoteError));
        }

        var authenticateResult = await HttpContext.AuthenticateAsync(IdentityConstants.ExternalScheme);
        if (!authenticateResult.Succeeded || authenticateResult.Principal is null)
        {
            return Redirect(BuildFrontendGoogleCallbackUrl(returnUrl, error: "Google sign-in did not return a valid identity."));
        }

        var principal = authenticateResult.Principal;
        var providerKey = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        var email = principal.FindFirstValue(ClaimTypes.Email);
        var fullName = principal.FindFirstValue(ClaimTypes.Name) ?? email ?? "Google user";

        if (string.IsNullOrWhiteSpace(providerKey) || string.IsNullOrWhiteSpace(email))
        {
            await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
            return Redirect(BuildFrontendGoogleCallbackUrl(returnUrl, error: "Google did not return the required account claims."));
        }

        var user = await userManager.FindByLoginAsync(GoogleDefaults.AuthenticationScheme, providerKey);
        if (user is null)
        {
            user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
                return Redirect(BuildFrontendGoogleCallbackUrl(
                    returnUrl,
                    error: "No existing Tanglaw Project account matches this Google email. Sign in with email and password first or ask an administrator to provision the account."));
            }

            var addLoginResult = await userManager.AddLoginAsync(
                user,
                new UserLoginInfo(GoogleDefaults.AuthenticationScheme, providerKey, GoogleDefaults.AuthenticationScheme));

            if (!addLoginResult.Succeeded)
            {
                await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
                return Redirect(BuildFrontendGoogleCallbackUrl(
                    returnUrl,
                    error: string.Join(' ', addLoginResult.Errors.Select(error => error.Description))));
            }
        }

        if (string.IsNullOrWhiteSpace(user.FullName))
        {
            user.FullName = fullName;
            await userManager.UpdateAsync(user);
        }

        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        await signInManager.SignInAsync(user, isPersistent: false);

        return Redirect(BuildFrontendGoogleCallbackUrl(returnUrl, error: null));
    }

    private async Task<UserProfileDto> MapUserProfileAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new UserProfileDto(user.Id, user.Email ?? string.Empty, user.FullName, roles.ToArray(), user.SupporterId);
    }

    private string BuildFrontendGoogleCallbackUrl(string? returnUrl, string? error)
    {
        var frontendBaseUrl = ResolveFrontendBaseUrl().TrimEnd('/');
        var sanitizedReturnUrl = NormalizeReturnUrl(returnUrl);
        var path = $"{frontendBaseUrl}{GoogleCallbackRoute}";

        if (!string.IsNullOrWhiteSpace(error))
        {
            return QueryHelpers.AddQueryString(path, new Dictionary<string, string?>
            {
                ["returnUrl"] = sanitizedReturnUrl,
                ["error"] = error
            });
        }

        return QueryHelpers.AddQueryString(path, "returnUrl", sanitizedReturnUrl);
    }

    private string ResolveFrontendBaseUrl()
    {
        var configuredFrontendUrl = configuration["Frontend:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(configuredFrontendUrl))
        {
            return configuredFrontendUrl;
        }

        var configuredCorsOrigin = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(configuredCorsOrigin))
        {
            return configuredCorsOrigin;
        }

        return $"{Request.Scheme}://{Request.Host}";
    }

    private static string NormalizeReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return "/portal";
        }

        if (!returnUrl.StartsWith('/') || returnUrl.StartsWith("//"))
        {
            return "/portal";
        }

        return returnUrl;
    }

    private static bool IsGoogleConfigured(IConfiguration configuration) =>
        !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"]) &&
        !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientSecret"]);

    private static (string firstName, string? lastName) SplitFullName(string fullName)
    {
        var parts = fullName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (parts.Length <= 1)
        {
            return (fullName, null);
        }

        return (parts[0], string.Join(' ', parts.Skip(1)));
    }
}
