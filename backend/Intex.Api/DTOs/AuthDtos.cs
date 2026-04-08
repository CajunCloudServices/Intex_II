using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(12)] string Password);

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(12)] string Password,
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    [Required, StringLength(20)] string Role,
    int? SupporterId);

/// <summary>Cookie session established server-side; no token is returned to the client.</summary>
public record AuthResponse(UserProfileDto User);

public record UserProfileDto(Guid Id, string Email, string FullName, string[] Roles, int? SupporterId);
