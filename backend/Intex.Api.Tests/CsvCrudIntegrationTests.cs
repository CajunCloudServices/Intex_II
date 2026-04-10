using System.Net;
using System.Net.Http.Json;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Intex.Api.Tests;

public class CsvCrudIntegrationTests : IClassFixture<CsvApiFactory>
{
    private readonly HttpClient _client;

    public CsvCrudIntegrationTests(CsvApiFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task StaffCanCreateUpdateAndDeleteSupporterProfile_WithCsvSeed()
    {
        await LoginAsStaffAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/supporters", new
        {
            supporterType = "MonetaryDonor",
            displayName = $"CSV Smoke Supporter {Guid.NewGuid():N}"[..24],
            organizationName = (string?)null,
            firstName = "Casey",
            lastName = "Smoke",
            relationshipType = "Donor",
            region = "Utah",
            country = "United States",
            email = $"csv-smoke-{Guid.NewGuid():N}@example.com",
            phone = "+18015550199",
            status = "Active",
            firstDonationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
            acquisitionChannel = "Website"
        });

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());
        var created = await createResponse.Content.ReadFromJsonAsync<SupporterResponse>();
        Assert.NotNull(created);

        var updateResponse = await _client.PutAsJsonAsync($"/api/supporters/{created!.Id}", new
        {
            supporterType = created.SupporterType,
            displayName = $"{created.DisplayName} Updated",
            organizationName = created.OrganizationName,
            firstName = created.FirstName,
            lastName = created.LastName,
            relationshipType = created.RelationshipType,
            region = created.Region,
            country = created.Country,
            email = created.Email,
            phone = "+18015550200",
            status = "Inactive",
            firstDonationDate = created.FirstDonationDate,
            acquisitionChannel = created.AcquisitionChannel
        });

        Assert.True(updateResponse.IsSuccessStatusCode, await updateResponse.Content.ReadAsStringAsync());
        var updated = await updateResponse.Content.ReadFromJsonAsync<SupporterResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Inactive", updated!.Status);
        Assert.Equal("+18015550200", updated.Phone);

        var deleteResponse = await _client.DeleteAsync($"/api/supporters/{created.Id}?confirm=true");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task StaffCanCreateUpdateAndDeleteDonation_WithCsvSeed()
    {
        await LoginAsStaffAsync();

        var supporters = await GetRequiredAsync<List<SupporterResponse>>("/api/supporters");
        var safehouses = await GetRequiredAsync<List<SafehouseResponse>>("/api/safehouses");
        var supporter = Assert.Single(supporters.Where(x => !x.Email.Contains("@intex.import", StringComparison.OrdinalIgnoreCase)).Take(1));
        var safehouse = Assert.Single(safehouses.Take(1));

        var createResponse = await _client.PostAsJsonAsync("/api/donations", new
        {
            supporterId = supporter.Id,
            donationType = "Monetary",
            donationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
            channelSource = "Website",
            currencyCode = "USD",
            amount = 250m,
            estimatedValue = 250m,
            impactUnit = "outcome units",
            isRecurring = false,
            campaignName = "CSV Smoke Campaign",
            notes = "CSV-backed donation smoke test",
            allocations = new[]
            {
                new
                {
                    safehouseId = safehouse.Id,
                    programArea = "Education",
                    amountAllocated = 250m,
                    allocationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    allocationNotes = "CSV smoke allocation"
                }
            }
        });

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());
        var created = await createResponse.Content.ReadFromJsonAsync<DonationResponse>();
        Assert.NotNull(created);

        var updateResponse = await _client.PutAsJsonAsync($"/api/donations/{created!.Id}", new
        {
            supporterId = created.SupporterId,
            donationType = created.DonationType,
            donationDate = created.DonationDate,
            channelSource = created.ChannelSource,
            currencyCode = created.CurrencyCode,
            amount = 300m,
            estimatedValue = 300m,
            impactUnit = created.ImpactUnit,
            isRecurring = true,
            campaignName = "CSV Smoke Campaign Updated",
            notes = "Updated donation smoke test",
            allocations = new[]
            {
                new
                {
                    safehouseId = safehouse.Id,
                    programArea = "Wellbeing",
                    amountAllocated = 300m,
                    allocationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    allocationNotes = "Updated CSV smoke allocation"
                }
            }
        });

        Assert.True(updateResponse.IsSuccessStatusCode, await updateResponse.Content.ReadAsStringAsync());
        var updated = await updateResponse.Content.ReadFromJsonAsync<DonationResponse>();
        Assert.NotNull(updated);
        Assert.Equal(300m, updated!.Amount);
        Assert.Equal("Wellbeing", updated.Allocations[0].ProgramArea);

        var deleteResponse = await _client.DeleteAsync($"/api/donations/{created.Id}?confirm=true");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task StaffCanCreateUpdateAndDeleteResident_WithCsvSeed()
    {
        await LoginAsStaffAsync();
        var safehouse = Assert.Single((await GetRequiredAsync<List<SafehouseResponse>>("/api/safehouses")).Take(1));

        var createPayload = BuildResidentRequest(safehouse.Id, $"C{Random.Shared.Next(7000, 9999)}", $"CSV-{Guid.NewGuid():N}"[..11]);
        var createResponse = await _client.PostAsJsonAsync("/api/residents", createPayload);

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());
        var created = await createResponse.Content.ReadFromJsonAsync<ResidentResponse>();
        Assert.NotNull(created);

        var updatePayload = BuildResidentRequest(
            created!.SafehouseId,
            created.CaseControlNumber,
            created.InternalCode,
            assignedSocialWorker: "CSV Worker 2",
            caseStatus: "Transferred",
            reintegrationStatus: "Completed",
            currentRiskLevel: "Low",
            familySoloParent: true,
            dateClosed: new DateOnly(2025, 6, 15));
        var updateResponse = await _client.PutAsJsonAsync($"/api/residents/{created.Id}", updatePayload);

        Assert.True(updateResponse.IsSuccessStatusCode, await updateResponse.Content.ReadAsStringAsync());
        var updated = await updateResponse.Content.ReadFromJsonAsync<ResidentResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Transferred", updated!.CaseStatus);
        Assert.Equal("Completed", updated.ReintegrationStatus);
        Assert.True(updated.FamilySoloParent);

        var deleteResponse = await _client.DeleteAsync($"/api/residents/{created.Id}?confirm=true");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task StaffCanCreateUpdateAndDeleteCaseNotesAndVisits_WithCsvSeed()
    {
        await LoginAsStaffAsync();
        var resident = Assert.Single((await GetRequiredAsync<List<ResidentResponse>>("/api/residents")).Take(1));

        var processCreate = await _client.PostAsJsonAsync("/api/process-recordings", new
        {
            residentId = resident.Id,
            sessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
            socialWorker = "CSV Worker",
            sessionType = "Individual",
            sessionDurationMinutes = 60,
            emotionalStateObserved = "Anxious",
            emotionalStateEnd = "Calmer",
            sessionNarrative = "CSV smoke session narrative.",
            interventionsApplied = "Supportive counseling.",
            followUpActions = "Schedule another session.",
            progressNoted = true,
            concernsFlagged = false,
            referralMade = false,
            restrictedNotes = "Admin-only note should be ignored for staff."
        });

        Assert.True(processCreate.IsSuccessStatusCode, await processCreate.Content.ReadAsStringAsync());
        var createdProcess = await processCreate.Content.ReadFromJsonAsync<ProcessRecordingResponse>();
        Assert.NotNull(createdProcess);

        var processUpdate = await _client.PutAsJsonAsync($"/api/process-recordings/{createdProcess!.Id}", new
        {
            residentId = resident.Id,
            sessionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            socialWorker = "CSV Worker Updated",
            sessionType = "Family",
            sessionDurationMinutes = 75,
            emotionalStateObserved = "Guarded",
            emotionalStateEnd = "Hopeful",
            sessionNarrative = "Updated CSV smoke session narrative.",
            interventionsApplied = "Family systems coaching.",
            followUpActions = "Review family visit readiness.",
            progressNoted = true,
            concernsFlagged = true,
            referralMade = false,
            restrictedNotes = "Still ignored for staff."
        });

        Assert.True(processUpdate.IsSuccessStatusCode, await processUpdate.Content.ReadAsStringAsync());
        var updatedProcess = await processUpdate.Content.ReadFromJsonAsync<ProcessRecordingResponse>();
        Assert.NotNull(updatedProcess);
        Assert.Equal("Family", updatedProcess!.SessionType);
        Assert.True(updatedProcess.ConcernsFlagged);

        var visitCreate = await _client.PostAsJsonAsync("/api/home-visitations", new
        {
            residentId = resident.Id,
            visitDate = DateOnly.FromDateTime(DateTime.UtcNow),
            socialWorker = "CSV Worker",
            visitType = "Follow-up",
            locationVisited = "Family residence",
            familyMembersPresent = "Mother, aunt",
            purpose = "Review reintegration readiness.",
            observations = "Home environment stable.",
            familyCooperationLevel = "High",
            safetyConcernsNoted = false,
            safetyConcernDetails = (string?)null,
            followUpNeeded = true,
            followUpNotes = "Coordinate school transition.",
            visitOutcome = "Positive"
        });

        Assert.True(visitCreate.IsSuccessStatusCode, await visitCreate.Content.ReadAsStringAsync());
        var createdVisit = await visitCreate.Content.ReadFromJsonAsync<HomeVisitationResponse>();
        Assert.NotNull(createdVisit);

        var visitUpdate = await _client.PutAsJsonAsync($"/api/home-visitations/{createdVisit!.Id}", new
        {
            residentId = resident.Id,
            visitDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            socialWorker = "CSV Worker Updated",
            visitType = "Monitoring",
            locationVisited = "Family residence",
            familyMembersPresent = "Mother",
            purpose = "Confirm follow-up progress.",
            observations = "Continued stability.",
            familyCooperationLevel = "Moderate",
            safetyConcernsNoted = false,
            safetyConcernDetails = (string?)null,
            followUpNeeded = false,
            followUpNotes = (string?)null,
            visitOutcome = "Stable"
        });

        Assert.True(visitUpdate.IsSuccessStatusCode, await visitUpdate.Content.ReadAsStringAsync());
        var updatedVisit = await visitUpdate.Content.ReadFromJsonAsync<HomeVisitationResponse>();
        Assert.NotNull(updatedVisit);
        Assert.Equal("Monitoring", updatedVisit!.VisitType);
        Assert.False(updatedVisit.FollowUpNeeded);

        var conferenceCreate = await _client.PostAsJsonAsync("/api/case-conferences", new
        {
            residentId = resident.Id,
            conferenceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            leadWorker = "CSV Worker",
            attendees = "CSV Worker, supervisor",
            purpose = "CSV smoke review",
            decisionsMade = "Continue current plan",
            followUpActions = "Reassess in two weeks",
            nextReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)),
            status = "Scheduled"
        });

        Assert.True(conferenceCreate.IsSuccessStatusCode, await conferenceCreate.Content.ReadAsStringAsync());
        var createdConference = await conferenceCreate.Content.ReadFromJsonAsync<CaseConferenceResponse>();
        Assert.NotNull(createdConference);

        var conferenceUpdate = await _client.PutAsJsonAsync($"/api/case-conferences/{createdConference!.Id}", new
        {
            residentId = resident.Id,
            conferenceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
            leadWorker = "CSV Worker Updated",
            attendees = "CSV Worker, supervisor, partner",
            purpose = "Updated CSV smoke review",
            decisionsMade = "Adjust reintegration timeline",
            followUpActions = "Coordinate partner outreach",
            nextReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            status = "Completed"
        });

        Assert.True(conferenceUpdate.IsSuccessStatusCode, await conferenceUpdate.Content.ReadAsStringAsync());
        var updatedConference = await conferenceUpdate.Content.ReadFromJsonAsync<CaseConferenceResponse>();
        Assert.NotNull(updatedConference);
        Assert.Equal("Completed", updatedConference!.Status);
        Assert.Equal("CSV Worker Updated", updatedConference.LeadWorker);
    }

    [Fact]
    public async Task AdminCanDeleteCaseNotesVisitsAndIncidents_WithCsvSeed()
    {
        await LoginAsAdminAsync();
        var resident = Assert.Single((await GetRequiredAsync<List<ResidentResponse>>("/api/residents")).Take(1));
        var safehouse = Assert.Single((await GetRequiredAsync<List<SafehouseResponse>>("/api/safehouses")).Take(1));

        var process = await CreateRequiredAsync<ProcessRecordingResponse>("/api/process-recordings", new
        {
            residentId = resident.Id,
            sessionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            socialWorker = "Admin CSV Worker",
            sessionType = "Individual",
            sessionDurationMinutes = 45,
            emotionalStateObserved = "Anxious",
            emotionalStateEnd = "Calmer",
            sessionNarrative = "Admin delete smoke process note.",
            interventionsApplied = "Counseling",
            followUpActions = "Monitor progress",
            progressNoted = true,
            concernsFlagged = false,
            referralMade = false,
            restrictedNotes = "Visible to admin."
        });

        var visit = await CreateRequiredAsync<HomeVisitationResponse>("/api/home-visitations", new
        {
            residentId = resident.Id,
            visitDate = DateOnly.FromDateTime(DateTime.UtcNow),
            socialWorker = "Admin CSV Worker",
            visitType = "Monitoring",
            locationVisited = "Family residence",
            familyMembersPresent = "Guardian",
            purpose = "Admin delete smoke visit.",
            observations = "Stable environment.",
            familyCooperationLevel = "High",
            safetyConcernsNoted = false,
            safetyConcernDetails = (string?)null,
            followUpNeeded = false,
            followUpNotes = (string?)null,
            visitOutcome = "Stable"
        });

        var conference = await CreateRequiredAsync<CaseConferenceResponse>("/api/case-conferences", new
        {
            residentId = resident.Id,
            conferenceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
            leadWorker = "Admin CSV Worker",
            attendees = "Admin CSV Worker",
            purpose = "Admin delete smoke conference.",
            decisionsMade = "Continue services",
            followUpActions = "Revisit next month",
            nextReviewDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            status = "Scheduled"
        });

        var incident = await CreateRequiredAsync<IncidentReportResponse>("/api/incidents", new
        {
            residentId = resident.Id,
            safehouseId = safehouse.Id,
            incidentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            incidentType = "Behavioral",
            severity = "Low",
            description = "Admin delete smoke incident.",
            responseTaken = "Provided support and debrief.",
            resolved = true,
            resolutionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            reportedBy = "Admin CSV Worker",
            followUpRequired = false
        });

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/process-recordings/{process.Id}?confirm=true")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/home-visitations/{visit.Id}?confirm=true")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/case-conferences/{conference.Id}?confirm=true")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/incidents/{incident.Id}?confirm=true")).StatusCode);
    }

    [Fact]
    public async Task AdminCanCreateUpdateAndDeleteSafehouse_WithCsvSeed()
    {
        await LoginAsAdminAsync();

        var uniqueCode = $"CSV-{Guid.NewGuid():N}"[..8].ToUpperInvariant();
        var createResponse = await _client.PostAsJsonAsync("/api/safehouses", new
        {
            code = uniqueCode,
            name = "CSV Smoke Safehouse",
            region = "Metro Manila",
            city = "Quezon City",
            province = "NCR",
            country = "Philippines",
            openDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
            status = "Active",
            capacityGirls = 18,
            capacityStaff = 6,
            currentOccupancy = 4,
            notes = "CSV-backed safehouse smoke test."
        });

        Assert.True(createResponse.IsSuccessStatusCode, await createResponse.Content.ReadAsStringAsync());
        var created = await createResponse.Content.ReadFromJsonAsync<SafehouseResponse>();
        Assert.NotNull(created);

        var updateResponse = await _client.PutAsJsonAsync($"/api/safehouses/{created!.Id}", new
        {
            code = created.Code,
            name = "CSV Smoke Safehouse Updated",
            region = created.Region,
            city = created.City,
            province = created.Province,
            country = created.Country,
            openDate = created.OpenDate,
            status = "Inactive",
            capacityGirls = 20,
            capacityStaff = 7,
            currentOccupancy = 5,
            notes = "Updated CSV-backed safehouse smoke test."
        });

        Assert.True(updateResponse.IsSuccessStatusCode, await updateResponse.Content.ReadAsStringAsync());
        var updated = await updateResponse.Content.ReadFromJsonAsync<SafehouseResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Inactive", updated!.Status);
        Assert.Equal(20, updated.CapacityGirls);

        var deleteResponse = await _client.DeleteAsync($"/api/safehouses/{created.Id}?confirm=true");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedDonorCanSubmitTrackedDonation_WithCsvSeed()
    {
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("donor@intex.local", "Donor!23456789"));
        Assert.True(loginResponse.IsSuccessStatusCode, await loginResponse.Content.ReadAsStringAsync());

        var beforeResponse = await _client.GetAsync("/api/donations/my-history");
        Assert.True(beforeResponse.IsSuccessStatusCode, await beforeResponse.Content.ReadAsStringAsync());
        var beforeHistory = await beforeResponse.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(beforeHistory);

        var submitResponse = await _client.PostAsJsonAsync("/api/donations/public-submit", new
        {
            isAnonymous = false,
            donorName = (string?)null,
            donorEmail = (string?)null,
            amount = 145m,
            isRecurring = false,
            recurringInterval = (string?)null,
            notes = "CSV donor tracked donation"
        });

        Assert.True(submitResponse.IsSuccessStatusCode, await submitResponse.Content.ReadAsStringAsync());

        var secondSubmitResponse = await _client.PostAsJsonAsync("/api/donations/public-submit", new
        {
            isAnonymous = false,
            donorName = (string?)null,
            donorEmail = (string?)null,
            amount = 155m,
            isRecurring = false,
            recurringInterval = (string?)null,
            notes = "CSV donor tracked donation two"
        });

        Assert.True(secondSubmitResponse.IsSuccessStatusCode, await secondSubmitResponse.Content.ReadAsStringAsync());

        var afterResponse = await _client.GetAsync("/api/donations/my-history");
        Assert.True(afterResponse.IsSuccessStatusCode, await afterResponse.Content.ReadAsStringAsync());
        var afterHistory = await afterResponse.Content.ReadFromJsonAsync<List<DonationResponse>>();
        Assert.NotNull(afterHistory);
        Assert.Equal(beforeHistory!.Count + 2, afterHistory!.Count);
    }

    private async Task LoginAsStaffAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("staff@intex.local", "Staff!23456789"));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private async Task LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin@intex.local", "Admin!23456789"));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private async Task<T> GetRequiredAsync<T>(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var payload = await response.Content.ReadFromJsonAsync<T>();
        return Assert.IsType<T>(payload);
    }

    private async Task<T> CreateRequiredAsync<T>(string path, object payload)
    {
        var response = await _client.PostAsJsonAsync(path, payload);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<T>();
        return Assert.IsType<T>(created);
    }

    private static object BuildResidentRequest(
        int safehouseId,
        string caseControlNumber,
        string internalCode,
        string assignedSocialWorker = "CSV Worker 1",
        string caseStatus = "Active",
        string reintegrationStatus = "In Progress",
        string currentRiskLevel = "Medium",
        bool familySoloParent = false,
        DateOnly? dateClosed = null)
        => new
        {
            caseControlNumber,
            internalCode,
            safehouseId,
            caseStatus,
            sex = "F",
            dateOfBirth = new DateOnly(2012, 2, 2),
            birthStatus = "Non-Marital",
            placeOfBirth = "Cebu City",
            religion = "Roman Catholic",
            caseCategory = "Neglected",
            subCatOrphaned = true,
            isTrafficked = false,
            subCatChildLabor = true,
            isPhysicalAbuseCase = true,
            isSexualAbuseCase = false,
            subCatOsaec = false,
            subCatCicl = false,
            subCatAtRisk = true,
            subCatStreetChild = false,
            subCatChildWithHiv = false,
            isPwd = false,
            pwdType = (string?)null,
            hasSpecialNeeds = false,
            specialNeedsDiagnosis = (string?)null,
            familyIs4Ps = true,
            familySoloParent,
            familyIndigenous = false,
            familyParentPwd = false,
            familyInformalSettler = true,
            dateOfAdmission = new DateOnly(2025, 4, 1),
            referralSource = "NGO",
            referringAgencyPerson = "CSV Referrer",
            dateColbRegistered = new DateOnly(2025, 4, 2),
            dateColbObtained = new DateOnly(2025, 4, 3),
            assignedSocialWorker,
            initialCaseAssessment = "CSV smoke resident assessment.",
            dateCaseStudyPrepared = new DateOnly(2025, 4, 5),
            reintegrationType = "Family Reunification",
            reintegrationStatus,
            initialRiskLevel = "High",
            currentRiskLevel,
            dateEnrolled = new DateOnly(2025, 4, 2),
            dateClosed,
            restrictedNotes = "CSV smoke resident note.",
            interventionPlans = new[]
            {
                new
                {
                    planCategory = "Psychosocial",
                    planDescription = "Provide counseling support.",
                    servicesProvided = "Counseling",
                    targetValue = (decimal?)null,
                    targetDate = new DateOnly(2025, 5, 1),
                    status = "Open",
                    caseConferenceDate = new DateOnly(2025, 4, 15)
                }
            }
        };
}
