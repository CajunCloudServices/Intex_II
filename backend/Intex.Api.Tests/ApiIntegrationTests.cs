using System.Net;
using System.Net.Http.Json;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Intex.Api.Tests;

public class ApiIntegrationTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public ApiIntegrationTests(ApiFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal("ok", payload?["status"]?.ToString());
    }

    [Fact]
    public async Task PublicImpactEndpoint_ReturnsSeededSnapshot()
    {
        var response = await _client.GetAsync("/api/public-impact");

        response.EnsureSuccessStatusCode();
        var snapshots = await response.Content.ReadFromJsonAsync<List<PublicImpactSnapshotResponse>>();

        Assert.NotNull(snapshots);
        Assert.NotEmpty(snapshots!);
        Assert.Equal("March impact highlights", snapshots![0].Headline);
    }

    [Fact]
    public async Task SafehousesEndpoint_ReturnsSeededRowsForStaff()
    {
        await LoginAsAdminAsync();

        var response = await _client.GetAsync("/api/safehouses");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var safehouses = await response.Content.ReadFromJsonAsync<List<SafehouseResponse>>();

        Assert.NotNull(safehouses);
        Assert.NotEmpty(safehouses!);
    }

    [Fact]
    public async Task IncidentsEndpoint_ReturnsSeededRowsForStaff()
    {
        await LoginAsAdminAsync();

        var response = await _client.GetAsync("/api/incidents");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var incidents = await response.Content.ReadFromJsonAsync<List<IncidentReportResponse>>();

        Assert.NotNull(incidents);
        Assert.NotEmpty(incidents!);
    }

    [Fact]
    public async Task DashboardSummary_ReturnsUpcomingCaseConferencesAndProgressSummary()
    {
        await LoginAsAdminAsync();

        var response = await _client.GetAsync("/api/dashboard/summary");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>();

        Assert.NotNull(summary);
        Assert.NotNull(summary!.UpcomingCaseConferences);
        Assert.NotEmpty(summary.UpcomingCaseConferences);
        Assert.True(summary.ProgressSummary.ProgressNoted >= 0);
    }

    [Fact]
    public async Task AdminCanCreateAndDeleteCaseConference()
    {
        await LoginAsAdminAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/case-conferences", new
        {
            residentId = 1,
            conferenceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            leadWorker = "Smoke Worker",
            attendees = "Smoke Worker, supervisor",
            purpose = "Smoke test conference",
            decisionsMade = "Review conference handling",
            followUpActions = "Verify conference CRUD",
            nextReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            status = "Scheduled"
        });

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());
        var created = await createResponse.Content.ReadFromJsonAsync<CaseConferenceResponse>();
        Assert.NotNull(created);

        var deleteResponse = await _client.DeleteAsync($"/api/case-conferences/{created!.Id}?confirm=true");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task ReportsEndpoints_ReturnNonEmptyPayloads()
    {
        await LoginAsAdminAsync();

        var donationTrends = await _client.GetAsync("/api/reports/donation-trends");
        var residentOutcomes = await _client.GetAsync("/api/reports/resident-outcomes");
        var safehousePerformance = await _client.GetAsync("/api/reports/safehouse-performance");
        var reintegration = await _client.GetAsync("/api/reports/reintegration-summary");
        var outreach = await _client.GetAsync("/api/reports/outreach-performance");

        Assert.True(donationTrends.IsSuccessStatusCode, await donationTrends.Content.ReadAsStringAsync());
        Assert.True(residentOutcomes.IsSuccessStatusCode, await residentOutcomes.Content.ReadAsStringAsync());
        Assert.True(safehousePerformance.IsSuccessStatusCode, await safehousePerformance.Content.ReadAsStringAsync());
        Assert.True(reintegration.IsSuccessStatusCode, await reintegration.Content.ReadAsStringAsync());
        Assert.True(outreach.IsSuccessStatusCode, await outreach.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task DonorCannotOpenStaffPortalEndpoints()
    {
        await LoginAsDonorAsync();

        var response = await _client.GetAsync("/api/supporters");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnonymousUserCannotOpenProtectedPortalEndpoints()
    {
        var supportersResponse = await _client.GetAsync("/api/supporters");
        var dashboardResponse = await _client.GetAsync("/api/dashboard/summary");

        Assert.Equal(HttpStatusCode.Unauthorized, supportersResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, dashboardResponse.StatusCode);
    }

    [Theory]
    [MemberData(nameof(AdminOnlyMutationCases))]
    public async Task StaffCannotUseAdminOnlyMutationRoutes(string path, object payload)
    {
        await LoginAsStaffAsync();

        var response = await _client.PostAsJsonAsync(path, payload);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AuditLogEndpoint_IsAdminOnly()
    {
        await LoginAsStaffAsync();

        var response = await _client.GetAsync("/api/audit-log");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminMutation_CreatesAuditLogEntry()
    {
        await LoginAsAdminAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/safehouses", new
        {
            code = "AUDIT-1",
            name = "Audit Safehouse",
            region = "Luzon",
            city = "Quezon City",
            province = "NCR",
            country = "Philippines",
            openDate = DateOnly.FromDateTime(DateTime.UtcNow),
            status = "Active",
            capacityGirls = 10,
            capacityStaff = 4,
            currentOccupancy = 2,
            notes = "Audit proof"
        });

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());

        var auditResponse = await _client.GetAsync("/api/audit-log?entityType=Safehouse&actionType=Create");
        Assert.True(auditResponse.IsSuccessStatusCode, await auditResponse.Content.ReadAsStringAsync());

        var events = await auditResponse.Content.ReadFromJsonAsync<List<AuditLogResponse>>();
        Assert.NotNull(events);
        Assert.Contains(events!, entry => entry.EntityType == "Safehouse" && entry.ActionType == "Create");
    }

    [Fact]
    public async Task AdminCanCreateAndDeleteSafehouse()
    {
        await LoginAsAdminAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/safehouses", new
        {
            code = "SMOKE-1",
            name = "Smoke Test Safehouse",
            region = "Metro Manila",
            city = "Quezon City",
            province = "NCR",
            country = "Philippines",
            openDate = DateOnly.FromDateTime(DateTime.UtcNow),
            status = "Active",
            capacityGirls = 12,
            capacityStaff = 4,
            currentOccupancy = 3,
            notes = "Created by test"
        });

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());
        var created = await createResponse.Content.ReadFromJsonAsync<SafehouseResponse>();
        Assert.NotNull(created);

        var deleteResponse = await _client.DeleteAsync($"/api/safehouses/{created!.Id}?confirm=true");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task LoginAndProtectedRoute_ReturnsTokenAndDonorHistory()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("donor@intex.local", "Donor!234567"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.Equal("donor@intex.local", auth!.User.Email);
        Assert.Contains("Donor", auth.User.Roles);

        var donorHistory = await _client.GetAsync("/api/donations/my-history");
        Assert.Equal(HttpStatusCode.Unauthorized, donorHistory.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.Token);
        donorHistory = await _client.GetAsync("/api/donations/my-history");

        Assert.True(donorHistory.IsSuccessStatusCode, await donorHistory.Content.ReadAsStringAsync());
        var donations = await donorHistory.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donations);
        Assert.NotEmpty(donations!);
    }

    private async Task LoginAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@intex.local", "Admin!234567"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);
    }

    private async Task LoginAsDonorAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("donor@intex.local", "Donor!234567"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);
    }

    private async Task LoginAsStaffAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("staff@intex.local", "Staff!234567"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);
    }

    public static IEnumerable<object[]> AdminOnlyMutationCases()
    {
        yield return new object[]
        {
            "/api/supporters",
            new
            {
                supporterType = "MonetaryDonor",
                displayName = "Staff Blocked Supporter",
                organizationName = (string?)null,
                firstName = "Blocked",
                lastName = "User",
                relationshipType = "Individual",
                region = "Luzon",
                country = "Philippines",
                email = "blocked-supporter@example.com",
                phone = (string?)null,
                status = "Active",
                firstDonationDate = (DateOnly?)null,
                acquisitionChannel = "Website"
            }
        };

        yield return new object[]
        {
            "/api/donations",
            new
            {
                supporterId = 1,
                donationType = "Monetary",
                donationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                channelSource = "Website",
                currencyCode = "USD",
                amount = 25m,
                estimatedValue = 25m,
                impactUnit = "pesos",
                isRecurring = false,
                campaignName = "Blocked",
                notes = "Blocked",
                allocations = new[]
                {
                    new
                    {
                        safehouseId = 1,
                        programArea = "Education",
                        amountAllocated = 25m,
                        allocationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                        allocationNotes = "Blocked"
                    }
                }
            }
        };

        yield return new object[]
        {
            "/api/residents",
            new
            {
                caseControlNumber = "RBAC-001",
                internalCode = "RBAC-001",
                safehouseId = 1,
                caseStatus = "Active",
                dateOfBirth = new DateOnly(2011, 1, 1),
                placeOfBirth = "Manila",
                religion = "Catholic",
                caseCategory = "Trafficking",
                isTrafficked = true,
                isPhysicalAbuseCase = false,
                isSexualAbuseCase = true,
                hasSpecialNeeds = false,
                specialNeedsDiagnosis = (string?)null,
                familyIs4Ps = true,
                familySoloParent = false,
                familyIndigenous = false,
                familyInformalSettler = false,
                dateOfAdmission = DateOnly.FromDateTime(DateTime.UtcNow),
                referralSource = "DSWD",
                referringAgencyPerson = "Blocked",
                assignedSocialWorker = "Blocked",
                initialCaseAssessment = "Blocked resident",
                reintegrationType = "Family",
                reintegrationStatus = "Assessment",
                initialRiskLevel = "High",
                currentRiskLevel = "High",
                dateClosed = (DateOnly?)null,
                restrictedNotes = (string?)null,
                interventionPlans = new[]
                {
                    new
                    {
                        planCategory = "Education",
                        planDescription = "Blocked",
                        servicesProvided = "Blocked",
                        targetValue = 1m,
                        targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
                        status = "Open",
                        caseConferenceDate = (DateOnly?)null
                    }
                }
            }
        };

        yield return new object[]
        {
            "/api/process-recordings",
            new
            {
                residentId = 1,
                sessionDate = DateOnly.FromDateTime(DateTime.UtcNow),
                socialWorker = "Blocked",
                sessionType = "Individual",
                sessionDurationMinutes = 45,
                emotionalStateObserved = "Anxious",
                emotionalStateEnd = "Calmer",
                sessionNarrative = "Blocked session narrative",
                interventionsApplied = "Blocked intervention",
                followUpActions = "Blocked follow-up",
                progressNoted = true,
                concernsFlagged = false,
                referralMade = false,
                restrictedNotes = (string?)null
            }
        };

        yield return new object[]
        {
            "/api/home-visitations",
            new
            {
                residentId = 1,
                visitDate = DateOnly.FromDateTime(DateTime.UtcNow),
                socialWorker = "Blocked",
                visitType = "Routine Follow-Up",
                locationVisited = "Blocked address",
                familyMembersPresent = "Blocked family",
                purpose = "Blocked purpose",
                observations = "Blocked observations",
                familyCooperationLevel = "Moderate",
                safetyConcernsNoted = false,
                followUpNeeded = true,
                followUpNotes = "Blocked follow-up",
                visitOutcome = "Stable"
            }
        };

        yield return new object[]
        {
            "/api/case-conferences",
            new
            {
                residentId = 1,
                conferenceDate = DateOnly.FromDateTime(DateTime.UtcNow),
                leadWorker = "Blocked",
                attendees = "Blocked attendees",
                purpose = "Blocked purpose",
                decisionsMade = "Blocked decisions",
                followUpActions = "Blocked actions",
                nextReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
                status = "Scheduled"
            }
        };

        yield return new object[]
        {
            "/api/safehouses",
            new
            {
                code = "RBAC-SH",
                name = "Blocked Safehouse",
                region = "Luzon",
                city = "Quezon City",
                province = "NCR",
                country = "Philippines",
                openDate = DateOnly.FromDateTime(DateTime.UtcNow),
                status = "Active",
                capacityGirls = 8,
                capacityStaff = 3,
                currentOccupancy = 1,
                notes = "Blocked"
            }
        };

        yield return new object[]
        {
            "/api/incidents",
            new
            {
                residentId = 1,
                safehouseId = 1,
                incidentDate = DateOnly.FromDateTime(DateTime.UtcNow),
                incidentType = "Safety",
                severity = "Low",
                description = "Blocked incident",
                responseTaken = "Blocked response",
                resolved = false,
                resolutionDate = (DateOnly?)null,
                reportedBy = "Blocked",
                followUpRequired = true
            }
        };
    }
}
