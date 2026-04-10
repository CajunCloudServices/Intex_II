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
            sex = "",
            dateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow),
            birthStatus = "",
            placeOfBirth = "",
            religion = "",
            caseCategory = "",
            subCatOrphaned = false,
            isTrafficked = false,
            subCatChildLabor = false,
            isPhysicalAbuseCase = false,
            isSexualAbuseCase = false,
            subCatOsaec = false,
            subCatCicl = false,
            subCatAtRisk = false,
            subCatStreetChild = false,
            subCatChildWithHiv = false,
            isPwd = false,
            pwdType = (string?)null,
            hasSpecialNeeds = false,
            specialNeedsDiagnosis = (string?)null,
            familyIs4Ps = false,
            familySoloParent = false,
            familyIndigenous = false,
            familyParentPwd = false,
            familyInformalSettler = false,
            dateOfAdmission = DateOnly.FromDateTime(DateTime.UtcNow),
            referralSource = "",
            referringAgencyPerson = (string?)null,
            dateColbRegistered = (DateOnly?)null,
            dateColbObtained = (DateOnly?)null,
            assignedSocialWorker = "",
            initialCaseAssessment = "",
            dateCaseStudyPrepared = (DateOnly?)null,
            reintegrationType = (string?)null,
            reintegrationStatus = (string?)null,
            initialRiskLevel = "",
            currentRiskLevel = "",
            dateEnrolled = (DateOnly?)null,
            dateClosed = (DateOnly?)null,
            restrictedNotes = (string?)null,
            interventionPlans = Array.Empty<object>()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "CaseControlNumber");
    }

    [Fact]
    public async Task ResidentCreate_WithInvalidEnumFields_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/residents", new
        {
            caseControlNumber = "C1234",
            internalCode = "LS-1234",
            safehouseId = 1,
            caseStatus = "Archived",
            sex = "X",
            dateOfBirth = new DateOnly(2011, 1, 1),
            birthStatus = "Maybe",
            placeOfBirth = "Cebu",
            religion = "Catholic",
            caseCategory = "Neglected",
            subCatOrphaned = false,
            isTrafficked = false,
            subCatChildLabor = false,
            isPhysicalAbuseCase = false,
            isSexualAbuseCase = false,
            subCatOsaec = false,
            subCatCicl = false,
            subCatAtRisk = false,
            subCatStreetChild = false,
            subCatChildWithHiv = false,
            isPwd = false,
            pwdType = (string?)null,
            hasSpecialNeeds = false,
            specialNeedsDiagnosis = (string?)null,
            familyIs4Ps = false,
            familySoloParent = false,
            familyIndigenous = false,
            familyParentPwd = false,
            familyInformalSettler = false,
            dateOfAdmission = new DateOnly(2025, 1, 1),
            referralSource = "NGO",
            referringAgencyPerson = (string?)null,
            dateColbRegistered = (DateOnly?)null,
            dateColbObtained = (DateOnly?)null,
            assignedSocialWorker = "SW-01",
            initialCaseAssessment = "Assessment",
            dateCaseStudyPrepared = (DateOnly?)null,
            reintegrationType = (string?)null,
            reintegrationStatus = (string?)null,
            initialRiskLevel = "Low",
            currentRiskLevel = "Low",
            dateEnrolled = (DateOnly?)null,
            dateClosed = (DateOnly?)null,
            restrictedNotes = (string?)null,
            interventionPlans = new[]
            {
                new
                {
                    planCategory = "Psychosocial",
                    planDescription = "Description",
                    servicesProvided = "Counseling",
                    targetValue = (decimal?)null,
                    targetDate = new DateOnly(2025, 2, 1),
                    status = "Open",
                    caseConferenceDate = (DateOnly?)null
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "Sex");
    }

    [Fact]
    public async Task ResidentCreate_WithInvalidDateOrder_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/residents", new
        {
            caseControlNumber = "C1234",
            internalCode = "LS-1234",
            safehouseId = 1,
            caseStatus = "Active",
            sex = "F",
            dateOfBirth = new DateOnly(2015, 1, 1),
            birthStatus = "Marital",
            placeOfBirth = "Cebu",
            religion = "Catholic",
            caseCategory = "Neglected",
            subCatOrphaned = false,
            isTrafficked = false,
            subCatChildLabor = false,
            isPhysicalAbuseCase = false,
            isSexualAbuseCase = false,
            subCatOsaec = false,
            subCatCicl = false,
            subCatAtRisk = false,
            subCatStreetChild = false,
            subCatChildWithHiv = false,
            isPwd = true,
            pwdType = "",
            hasSpecialNeeds = true,
            specialNeedsDiagnosis = "",
            familyIs4Ps = false,
            familySoloParent = false,
            familyIndigenous = false,
            familyParentPwd = false,
            familyInformalSettler = false,
            dateOfAdmission = new DateOnly(2014, 12, 31),
            referralSource = "NGO",
            referringAgencyPerson = (string?)null,
            dateColbRegistered = new DateOnly(2025, 1, 10),
            dateColbObtained = new DateOnly(2025, 1, 5),
            assignedSocialWorker = "SW-01",
            initialCaseAssessment = "Assessment",
            dateCaseStudyPrepared = new DateOnly(2014, 12, 30),
            reintegrationType = (string?)null,
            reintegrationStatus = (string?)null,
            initialRiskLevel = "Low",
            currentRiskLevel = "Low",
            dateEnrolled = new DateOnly(2014, 12, 30),
            dateClosed = new DateOnly(2014, 12, 30),
            restrictedNotes = (string?)null,
            interventionPlans = new[]
            {
                new
                {
                    planCategory = "Psychosocial",
                    planDescription = "Description",
                    servicesProvided = "Counseling",
                    targetValue = (decimal?)null,
                    targetDate = new DateOnly(2025, 2, 1),
                    status = "Open",
                    caseConferenceDate = new DateOnly(2025, 1, 15)
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "PwdType");
    }

    [Fact]
    public async Task DonationCreate_WithAllocationMismatch_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/donations", new
        {
            supporterId = 1,
            donationType = "Monetary",
            donationDate = new DateOnly(2026, 4, 1),
            channelSource = "Website",
            currencyCode = "USD",
            amount = 100m,
            estimatedValue = 100m,
            impactUnit = "Meals",
            isRecurring = false,
            campaignName = (string?)null,
            notes = (string?)null,
            allocations = new[]
            {
                new
                {
                    safehouseId = 1,
                    programArea = "Nutrition",
                    amountAllocated = 60m,
                    allocationDate = new DateOnly(2026, 4, 1),
                    allocationNotes = (string?)null
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "Allocations");
    }

    [Fact]
    public async Task ResidentCreate_WithDuplicateGeneratedIdentifiers_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/residents", new
        {
            caseControlNumber = "C0073",
            internalCode = "R-2025-001",
            safehouseId = 1,
            caseStatus = "Active",
            sex = "F",
            dateOfBirth = new DateOnly(2012, 1, 1),
            birthStatus = "Non-Marital",
            placeOfBirth = "Cebu",
            religion = "Catholic",
            caseCategory = "Neglected",
            subCatOrphaned = false,
            isTrafficked = false,
            subCatChildLabor = false,
            isPhysicalAbuseCase = false,
            isSexualAbuseCase = false,
            subCatOsaec = false,
            subCatCicl = false,
            subCatAtRisk = false,
            subCatStreetChild = false,
            subCatChildWithHiv = false,
            isPwd = false,
            pwdType = (string?)null,
            hasSpecialNeeds = false,
            specialNeedsDiagnosis = (string?)null,
            familyIs4Ps = false,
            familySoloParent = false,
            familyIndigenous = false,
            familyParentPwd = false,
            familyInformalSettler = false,
            dateOfAdmission = new DateOnly(2026, 4, 1),
            referralSource = "Government Agency",
            referringAgencyPerson = (string?)null,
            dateColbRegistered = (DateOnly?)null,
            dateColbObtained = (DateOnly?)null,
            assignedSocialWorker = "Ana Santos",
            initialCaseAssessment = "Duplicate identifier test.",
            dateCaseStudyPrepared = (DateOnly?)null,
            reintegrationType = (string?)null,
            reintegrationStatus = (string?)null,
            initialRiskLevel = "Medium",
            currentRiskLevel = "Medium",
            dateEnrolled = (DateOnly?)null,
            dateClosed = (DateOnly?)null,
            restrictedNotes = (string?)null,
            interventionPlans = new[]
            {
                new
                {
                    planCategory = "Psychosocial",
                    planDescription = "Description",
                    servicesProvided = "Counseling",
                    targetValue = (decimal?)null,
                    targetDate = new DateOnly(2026, 5, 1),
                    status = "Open",
                    caseConferenceDate = (DateOnly?)null
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "CaseControlNumber");
    }

    [Fact]
    public async Task PublicDonationSubmit_WithMissingRecurringInterval_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/donations/public-submit", new
        {
            isAnonymous = false,
            donorName = (string?)null,
            donorEmail = (string?)null,
            amount = 25m,
            isRecurring = true,
            recurringInterval = (string?)null,
            notes = "Test"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "RecurringInterval");
    }

    [Fact]
    public async Task SocialAnalytics_WithInvalidPageSize_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.GetAsync("/api/reports/social-analytics?page=1&pageSize=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertHasValidationErrorShapeAsync(response, "pageSize");
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

    [Fact]
    public async Task Register_WithSupporterIdButWithoutDonorRole_ReturnsBadRequest()
    {
        await LoginAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"staff-only-{Guid.NewGuid():N}@example.com",
            password = "StrongPass!234",
            fullName = "Staff Only User",
            roles = new[] { "Staff" },
            supporterId = 1
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadAsStringAsync();
        Assert.Contains("donor role", payload, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task PublicRegisterDonor_WithWeakPassword_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register-donor", new
        {
            email = $"public-weak-{Guid.NewGuid():N}@example.com",
            password = "Weakpass1",
            fullName = "Public Weak User",
            region = "Mountain West",
            country = "United States"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadAsStringAsync();
        Assert.Contains("password", payload, StringComparison.OrdinalIgnoreCase);
    }

    private async Task LoginAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@intex.local", "Admin!23456789"));
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
