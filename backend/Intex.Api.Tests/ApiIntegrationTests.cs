using System.Net;
using System.Net.Http.Json;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Intex.Api.Tests;

public class ApiIntegrationTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;
    private readonly ApiFactory _factory;

    public ApiIntegrationTests(ApiFactory factory)
    {
        _factory = factory;
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
        Assert.Equal(4, snapshots![0].Metrics.Count);
        Assert.Equal("Active residents", snapshots![0].Metrics[0].Label);
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
        var socialAnalytics = await _client.GetAsync("/api/reports/social-analytics");

        Assert.True(donationTrends.IsSuccessStatusCode, await donationTrends.Content.ReadAsStringAsync());
        Assert.True(residentOutcomes.IsSuccessStatusCode, await residentOutcomes.Content.ReadAsStringAsync());
        Assert.True(safehousePerformance.IsSuccessStatusCode, await safehousePerformance.Content.ReadAsStringAsync());
        Assert.True(reintegration.IsSuccessStatusCode, await reintegration.Content.ReadAsStringAsync());
        Assert.True(outreach.IsSuccessStatusCode, await outreach.Content.ReadAsStringAsync());
        Assert.True(socialAnalytics.IsSuccessStatusCode, await socialAnalytics.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task SafehousePerformance_IncludesMonthlyTrends()
    {
        await LoginAsAdminAsync();

        var response = await _client.GetAsync("/api/reports/safehouse-performance");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        var payload = await response.Content.ReadFromJsonAsync<SafehousePerformanceResponse>();
        Assert.NotNull(payload);
        Assert.NotEmpty(payload!.MonthlyTrends);

        var firstTrend = payload.MonthlyTrends[0];
        Assert.True(firstTrend.MonthlyTrend.Count >= 3, "Expected at least 3 monthly trend points per safehouse.");
        Assert.True(firstTrend.MonthlyTrend.All(p => p.AvgHealthScore > 0), "Each trend point should have a non-zero health score.");
    }

    [Fact]
    public async Task SocialAnalytics_HasPostLevelData()
    {
        await LoginAsAdminAsync();

        var response = await _client.GetAsync("/api/reports/social-analytics");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        var payload = await response.Content.ReadFromJsonAsync<SocialAnalyticsResponse>();
        Assert.NotNull(payload);
        Assert.True(payload!.Posts.Count >= 1, "Expected at least one social post.");
        Assert.True(payload.Posts[0].Impressions > 0, "First post should have non-zero impressions.");
        Assert.True(payload.Posts[0].EngagementRate > 0, "First post should have a non-zero engagement rate.");
        Assert.True(payload.Totals.TotalPosts >= 1);
        Assert.NotEmpty(payload.PlatformSummaries);
    }

    [Fact]
    public async Task DonorHistory_IncludesAllocationsWithSafehouseName()
    {
        await LoginAsDonorAsync();

        var response = await _client.GetAsync("/api/donations/my-history");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        var donations = await response.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donations);
        Assert.NotEmpty(donations!);

        var withAllocations = donations!.FirstOrDefault(d => d.Allocations.Count > 0);
        Assert.NotNull(withAllocations);
        Assert.False(string.IsNullOrWhiteSpace(withAllocations!.Allocations[0].SafehouseName));
        Assert.False(string.IsNullOrWhiteSpace(withAllocations.Allocations[0].ProgramArea));
    }

    [Fact]
    public async Task DonorImpactSummary_IsScopedToAuthenticatedDonor()
    {
        await LoginAsDonorAsync();
        var donor1SummaryResponse = await _client.GetAsync("/api/donations/my-impact-summary");
        Assert.True(donor1SummaryResponse.IsSuccessStatusCode, await donor1SummaryResponse.Content.ReadAsStringAsync());
        var donor1Summary = await donor1SummaryResponse.Content.ReadFromJsonAsync<DonorImpactSummaryResponse>();
        var donor1HistoryResponse = await _client.GetAsync("/api/donations/my-history");
        var donor1History = await donor1HistoryResponse.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donor1Summary);
        Assert.NotNull(donor1History);

        await LoginAsDonor2Async();
        var donor2SummaryResponse = await _client.GetAsync("/api/donations/my-impact-summary");
        Assert.True(donor2SummaryResponse.IsSuccessStatusCode, await donor2SummaryResponse.Content.ReadAsStringAsync());
        var donor2Summary = await donor2SummaryResponse.Content.ReadFromJsonAsync<DonorImpactSummaryResponse>();
        var donor2HistoryResponse = await _client.GetAsync("/api/donations/my-history");
        var donor2History = await donor2HistoryResponse.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donor2Summary);
        Assert.NotNull(donor2History);

        var donor1TotalFromHistory = donor1History!.Sum(d => d.Amount ?? d.EstimatedValue);
        var donor2TotalFromHistory = donor2History!.Sum(d => d.Amount ?? d.EstimatedValue);

        Assert.Equal(donor1TotalFromHistory, donor1Summary!.TotalDonated);
        Assert.Equal(donor2TotalFromHistory, donor2Summary!.TotalDonated);
        Assert.Equal(donor1History.Count, donor1Summary.DonationCount);
        Assert.Equal(donor2History.Count, donor2Summary.DonationCount);
    }

    [Fact]
    public async Task DonorImpactPrediction_ReturnsDeterministicOutcomeRows()
    {
        await LoginAsDonorAsync();

        var response = await _client.GetAsync("/api/donations/predict-impact?amount=5000");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var payload = await response.Content.ReadFromJsonAsync<DonationImpactPredictionResponse>();
        Assert.NotNull(payload);
        Assert.Equal(5000m, payload!.Amount);
        Assert.NotEmpty(payload.Outcomes);
        Assert.All(payload.Outcomes, outcome =>
        {
            Assert.False(string.IsNullOrWhiteSpace(outcome.ProgramArea));
            Assert.True(outcome.AllocatedAmount >= 0);
            Assert.True(outcome.UnitCost > 0);
            Assert.True(outcome.EstimatedUnits >= 0);
        });
        Assert.False(string.IsNullOrWhiteSpace(payload.Assumptions));
    }

    [Fact]
    public async Task StaffCannotAccessDonorOnlyImpactEndpoints()
    {
        await LoginAsStaffAsync();

        var summary = await _client.GetAsync("/api/donations/my-impact-summary");
        var breakdown = await _client.GetAsync("/api/donations/my-allocation-breakdown");
        var prediction = await _client.GetAsync("/api/donations/predict-impact?amount=1000");

        Assert.Equal(HttpStatusCode.Forbidden, summary.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, breakdown.StatusCode);
        Assert.Equal(HttpStatusCode.OK, prediction.StatusCode);
    }

    [Fact]
    public async Task DonorCannotSeeOtherDonorsHistory()
    {
        // donor2@intex.local has one distinct donation (SupporterId = donor2's supporter row).
        // Logging in as donor1 must not return donor2's donation.
        await LoginAsDonorAsync();
        var donor1History = await _client.GetAsync("/api/donations/my-history");
        var donor1Donations = await donor1History.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donor1Donations);

        await LoginAsDonor2Async();
        var donor2History = await _client.GetAsync("/api/donations/my-history");
        var donor2Donations = await donor2History.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donor2Donations);

        var donor1Ids = donor1Donations!.Select(d => d.Id).ToHashSet();
        var donor2Ids = donor2Donations!.Select(d => d.Id).ToHashSet();
        Assert.Empty(donor1Ids.Intersect(donor2Ids));
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
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("donor@intex.local", "Donor!23456789"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.Equal("donor@intex.local", auth!.User.Email);
        Assert.Contains("Donor", auth.User.Roles);

        using var anon = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false,
        });
        var anonymousDonorHistory = await anon.GetAsync("/api/donations/my-history");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousDonorHistory.StatusCode);

        var donorHistory = await _client.GetAsync("/api/donations/my-history");

        Assert.True(donorHistory.IsSuccessStatusCode, await donorHistory.Content.ReadAsStringAsync());
        var donations = await donorHistory.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(donations);
        Assert.NotEmpty(donations!);
    }

    private async Task LoginAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@intex.local", "Admin!23456789"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
    }

    private async Task LoginAsDonorAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("donor@intex.local", "Donor!23456789"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
    }

    private async Task LoginAsDonor2Async()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("donor2@intex.local", "Donor2!2345678"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
    }

    private async Task LoginAsStaffAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("staff@intex.local", "Staff!23456789"));
        Assert.True(login.IsSuccessStatusCode, await login.Content.ReadAsStringAsync());

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
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
