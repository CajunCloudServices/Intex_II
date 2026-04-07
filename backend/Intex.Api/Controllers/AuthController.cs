using System.Security.Claims;
using Intex.Api.Authorization;
using Intex.Api.DTOs;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IConfiguration configuration,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtTokenService jwtTokenService) : ControllerBase
{
    private const string GoogleCallbackRoute = "/login/google/callback";

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(await jwtTokenService.CreateAuthResponseAsync(user));
    }

    [HttpPost("register")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (!RoleNames.All.Contains(request.Role))
        {
            return BadRequest(new { message = "Unsupported role." });
        }

        if (request.Role == RoleNames.Donor && !request.SupporterId.HasValue)
        {
            return BadRequest(new { message = "Donor accounts require a supporterId." });
        }

        if (request.Role != RoleNames.Donor && request.SupporterId.HasValue)
        {
            return BadRequest(new { message = "Only donor accounts may link a supporterId." });
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

        await userManager.AddToRoleAsync(user, request.Role);
        return CreatedAtAction(nameof(Me), await jwtTokenService.CreateAuthResponseAsync(user));
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

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new UserProfileDto(user.Id, user.Email ?? string.Empty, user.FullName, roles.ToArray(), user.SupporterId));
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
                    error: "No existing HarborLight account matches this Google email. Sign in with email and password first or ask an administrator to provision the account."));
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

        var authResponse = await jwtTokenService.CreateAuthResponseAsync(user);
        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);

        return Redirect(BuildFrontendGoogleCallbackUrl(returnUrl, token: authResponse.Token));
    }

    private string BuildFrontendGoogleCallbackUrl(string? returnUrl, string? token = null, string? error = null)
    {
        var frontendBaseUrl = ResolveFrontendBaseUrl();
        var sanitizedReturnUrl = NormalizeReturnUrl(returnUrl);

        var values = new List<string>();
        if (!string.IsNullOrWhiteSpace(token))
        {
            values.Add($"token={Uri.EscapeDataString(token)}");
        }

        if (!string.IsNullOrWhiteSpace(error))
        {
            values.Add($"error={Uri.EscapeDataString(error)}");
        }

        values.Add($"returnUrl={Uri.EscapeDataString(sanitizedReturnUrl)}");

        return $"{frontendBaseUrl.TrimEnd('/')}{GoogleCallbackRoute}#{string.Join('&', values)}";
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
}
