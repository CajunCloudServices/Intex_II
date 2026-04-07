using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record SupporterRequest(
    [Required, StringLength(50), RegularExpression(ValidationPatterns.SupporterType)] string SupporterType,
    [Required, StringLength(150)] string DisplayName,
    [StringLength(150)] string? OrganizationName,
    [StringLength(80)] string? FirstName,
    [StringLength(80)] string? LastName,
    [Required, StringLength(50)] string RelationshipType,
    [Required, StringLength(80)] string Region,
    [Required, StringLength(80)] string Country,
    [Required, EmailAddress, StringLength(200)] string Email,
    [StringLength(20), RegularExpression(ValidationPatterns.Phone)] string? Phone,
    [Required, StringLength(20), RegularExpression(ValidationPatterns.SupporterStatus)] string Status,
    DateOnly? FirstDonationDate,
    [Required, StringLength(50)] string AcquisitionChannel);

public record SupporterResponse(
    int Id,
    string SupporterType,
    string DisplayName,
    string? OrganizationName,
    string? FirstName,
    string? LastName,
    string RelationshipType,
    string Region,
    string Country,
    string Email,
    string? Phone,
    string Status,
    DateOnly? FirstDonationDate,
    string AcquisitionChannel,
    DateTime CreatedAtUtc,
    int DonationCount,
    decimal LifetimeGiving);
