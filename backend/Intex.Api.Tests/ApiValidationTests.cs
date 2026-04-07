using System.Net;
using System.Net.Http.Json;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Intex.Api.Tests;

public class ApiValidationTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public ApiValidationTests(ApiFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task LoginRequest_WithBadData_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new { email = "", password = "short" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SupporterCreate_WithBadEmail_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/supporters", new
        {
            supporterType = "MonetaryDonor",
            displayName = "Jordan Lee",
            organizationName = (string?)null,
            firstName = "Jordan",
            lastName = "Lee",
            relationshipType = "International",
            region = "Luzon",
            country = "Philippines",
            email = "not-an-email",
            phone = (string?)null,
            status = "Active",
            firstDonationDate = (DateOnly?)null,
            acquisitionChannel = "Website"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DonationCreate_WithMissingCoreFields_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/donations", new
        {
            supporterId = 0,
            donationType = "",
            donationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            channelSource = "",
            currencyCode = (string?)null,
            amount = (decimal?)null,
            estimatedValue = 0m,
            impactUnit = "",
            isRecurring = false,
            campaignName = (string?)null,
            notes = (string?)null,
            allocations = Array.Empty<object>()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ResidentCreate_WithMissingCaseFields_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/residents", new
        {
            caseControlNumber = "",
            internalCode = "",
            safehouseId = 0,
            caseStatus = "",
            dateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow),
            placeOfBirth = "",
            religion = "",
            caseCategory = "",
            isTrafficked = false,
            isPhysicalAbuseCase = false,
            isSexualAbuseCase = false,
            hasSpecialNeeds = false,
            specialNeedsDiagnosis = (string?)null,
            familyIs4Ps = false,
            familySoloParent = false,
            familyIndigenous = false,
            familyInformalSettler = false,
            dateOfAdmission = DateOnly.FromDateTime(DateTime.UtcNow),
            referralSource = "",
            referringAgencyPerson = (string?)null,
            assignedSocialWorker = "",
            initialCaseAssessment = "",
            reintegrationType = (string?)null,
            reintegrationStatus = (string?)null,
            initialRiskLevel = "",
            currentRiskLevel = "",
            dateClosed = (DateOnly?)null,
            restrictedNotes = (string?)null,
            interventionPlans = Array.Empty<object>()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CaseConferenceCreate_WithMissingCoreFields_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/case-conferences", new
        {
            residentId = 0,
            conferenceDate = DateOnly.FromDateTime(DateTime.UtcNow),
            leadWorker = "",
            attendees = "",
            purpose = "",
            decisionsMade = "",
            followUpActions = "",
            nextReviewDate = (DateOnly?)null,
            status = ""
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithWeakPassword_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "weak-password-user@example.com",
            password = "Weakpass1",
            fullName = "Weak Password User",
            role = "Staff",
            supporterId = (int?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadAsStringAsync();
        Assert.Contains("password", payload, StringComparison.OrdinalIgnoreCase);
    }

    private async Task LoginAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@intex.local", "Admin!234567"));
        login.EnsureSuccessStatusCode();

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);
    }
}
