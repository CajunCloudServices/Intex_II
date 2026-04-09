using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(14)] string Password);

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(14)] string Password,
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    [StringLength(20)] string? Role,
    string[]? Roles,
    int? SupporterId);

public record PublicDonorRegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(14)] string Password,
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    [Required, StringLength(100, MinimumLength = 2)] string Region,
    [Required, StringLength(100, MinimumLength = 2)] string Country,
    [Phone, StringLength(50)] string? Phone);

/// <summary>Cookie session established server-side; no token is returned to the client.</summary>
public record AuthResponse(UserProfileDto User);

public record UserProfileDto(Guid Id, string Email, string FullName, string[] Roles, int? SupporterId);

public record MfaSetupResponse(string SharedKey, string AuthenticatorUri);

public record MfaVerifyRequest(
    [Required, MinLength(6), MaxLength(8)] string Code);

public record LoginMfaRequest(
    [Required, MinLength(6), MaxLength(8)] string Code);

