using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
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
        await AssertHasValidationErrorShapeAsync(response, "email");
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
        await AssertHasValidationErrorShapeAsync(response, "SupporterId");
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
        await AssertHasValidationErrorShapeAsync(response, "CaseControlNumber");
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
    public async Task SupporterCreate_TrimsInputFields_BeforePersist()
    {
        await LoginAsAdminAsync();

        var id = Guid.NewGuid().ToString("N")[..8];
        var response = await _client.PostAsJsonAsync("/api/supporters", new
        {
            supporterType = "  MonetaryDonor ",
            displayName = $"  Trim Test {id}  ",
            organizationName = "   Team   Lighthouse ",
            firstName = "  Jordan ",
            lastName = "  Lee ",
            relationshipType = " International ",
            region = " Metro Manila ",
            country = " Philippines ",
            email = $" trim-{id}@example.com ",
            phone = " +63 912 555 1000 ",
            status = " Active ",
            firstDonationDate = (DateOnly?)null,
            acquisitionChannel = " Website "
        });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<SupporterResponse>();
        Assert.NotNull(created);
        Assert.Equal($"Trim Test {id}", created!.DisplayName);
        Assert.Equal("Team Lighthouse", created.OrganizationName);
        Assert.Equal("MonetaryDonor", created.SupporterType);
        Assert.Equal("Active", created.Status);
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
        Assert.NotNull(auth!.User);
    }

    private static async Task AssertHasValidationErrorShapeAsync(HttpResponseMessage response, string expectedFieldName)
    {
        var payload = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;

        Assert.Equal("Validation failed", root.GetProperty("title").GetString());
        Assert.Equal(400, root.GetProperty("status").GetInt32());
        Assert.True(root.TryGetProperty("traceId", out var traceIdElement));
        Assert.False(string.IsNullOrWhiteSpace(traceIdElement.GetString()));
        Assert.True(root.TryGetProperty("errors", out var errorsElement));
        Assert.Equal(JsonValueKind.Array, errorsElement.ValueKind);
        Assert.Contains(errorsElement.EnumerateArray(), item =>
            item.TryGetProperty("field", out var field) &&
            field.GetString()!.Contains(expectedFieldName, StringComparison.OrdinalIgnoreCase));
    }
}
