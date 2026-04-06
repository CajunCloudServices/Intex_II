using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record SupporterRequest(
    [Required, StringLength(50)] string SupporterType,
    [Required, StringLength(150)] string DisplayName,
    string? OrganizationName,
    string? FirstName,
    string? LastName,
    [Required, StringLength(50)] string RelationshipType,
    [Required, StringLength(80)] string Region,
    [Required, StringLength(80)] string Country,
    [Required, EmailAddress, StringLength(200)] string Email,
    string? Phone,
    [Required, StringLength(20)] string Status,
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
