using Intex.Api.Authorization;
using Intex.Api.DTOs;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtTokenService jwtTokenService) : ControllerBase
{
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
}
