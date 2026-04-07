using System.Net;
using System.Net.Http.Json;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;

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
}
