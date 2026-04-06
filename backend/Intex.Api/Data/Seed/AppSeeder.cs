using System.Text.Json;
using Intex.Api.Authorization;
using Intex.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Data.Seed;

public class AppSeeder(
    ApplicationDbContext dbContext,
    RoleManager<IdentityRole<Guid>> roleManager,
    UserManager<ApplicationUser> userManager)
{
    public async Task SeedAsync()
    {
        foreach (var roleName in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            }
        }

        if (!await dbContext.Safehouses.AnyAsync())
        {
            await SeedDomainDataAsync();
        }

        await SeedUsersAsync();
    }

    private async Task SeedDomainDataAsync()
    {
        // These rows are intentionally small and readable so the starter app shows real data without hiding the shape of the model.
        var safehouses = new[]
        {
            new Safehouse
            {
                Code = "SH-01",
                Name = "Manila Hope Home",
                Region = "Luzon",
                City = "Quezon City",
                Province = "Metro Manila",
                OpenDate = new DateOnly(2021, 1, 15),
                CapacityGirls = 24,
                CapacityStaff = 12,
                CurrentOccupancy = 18,
                Notes = "Primary intake safehouse."
            },
            new Safehouse
            {
                Code = "SH-02",
                Name = "Cebu Reintegration Center",
                Region = "Visayas",
                City = "Cebu City",
                Province = "Cebu",
                OpenDate = new DateOnly(2022, 8, 1),
                CapacityGirls = 16,
                CapacityStaff = 8,
                CurrentOccupancy = 10,
                Notes = "Focus on family transition support."
            }
        };

        dbContext.Safehouses.AddRange(safehouses);
        await dbContext.SaveChangesAsync();

        var supporters = new[]
        {
            new Supporter
            {
                SupporterType = "MonetaryDonor",
                DisplayName = "Jordan Lee",
                FirstName = "Jordan",
                LastName = "Lee",
                RelationshipType = "International",
                Region = "North America",
                Country = "United States",
                Email = "donor@intex.local",
                Phone = "555-0101",
                Status = "Active",
                FirstDonationDate = new DateOnly(2025, 4, 15),
                AcquisitionChannel = "Website",
                CreatedAtUtc = new DateTime(2025, 4, 15, 12, 0, 0, DateTimeKind.Utc)
            },
            new Supporter
            {
                SupporterType = "PartnerOrganization",
                DisplayName = "Hope Collective Church",
                OrganizationName = "Hope Collective Church",
                RelationshipType = "PartnerOrganization",
                Region = "Luzon",
                Country = "Philippines",
                Email = "partnerships@hopecollective.example",
                Phone = "555-0102",
                Status = "Active",
                FirstDonationDate = new DateOnly(2025, 7, 1),
                AcquisitionChannel = "PartnerReferral",
                CreatedAtUtc = new DateTime(2025, 7, 1, 9, 0, 0, DateTimeKind.Utc)
            }
        };

        dbContext.Supporters.AddRange(supporters);
        await dbContext.SaveChangesAsync();

        var residents = new[]
        {
            new Resident
            {
                CaseControlNumber = "C0073",
                InternalCode = "R-2025-001",
                SafehouseId = safehouses[0].Id,
                CaseStatus = "Active",
                DateOfBirth = new DateOnly(2011, 4, 20),
                PlaceOfBirth = "Manila",
                Religion = "Catholic",
                CaseCategory = "Neglected",
                IsTrafficked = true,
                IsPhysicalAbuseCase = false,
                IsSexualAbuseCase = true,
                HasSpecialNeeds = false,
                FamilyIs4Ps = true,
                FamilySoloParent = true,
                FamilyIndigenous = false,
                FamilyInformalSettler = true,
                DateOfAdmission = new DateOnly(2025, 2, 10),
                ReferralSource = "Government Agency",
                ReferringAgencyPerson = "DSWD Intake Team",
                AssignedSocialWorker = "Ana Santos",
                InitialCaseAssessment = "For reunification with extended family support.",
                ReintegrationType = "Family Reunification",
                ReintegrationStatus = "In Progress",
                InitialRiskLevel = "High",
                CurrentRiskLevel = "Medium",
                CreatedAtUtc = new DateTime(2025, 2, 10, 8, 0, 0, DateTimeKind.Utc),
                RestrictedNotes = "Initial trauma triggers documented in intake notes."
            },
            new Resident
            {
                CaseControlNumber = "C0081",
                InternalCode = "R-2025-002",
                SafehouseId = safehouses[1].Id,
                CaseStatus = "Active",
                DateOfBirth = new DateOnly(2010, 11, 12),
                PlaceOfBirth = "Cebu City",
                Religion = "Christian",
                CaseCategory = "Abandoned",
                IsTrafficked = false,
                IsPhysicalAbuseCase = true,
                IsSexualAbuseCase = false,
                HasSpecialNeeds = true,
                SpecialNeedsDiagnosis = "Learning support needs",
                FamilyIs4Ps = false,
                FamilySoloParent = false,
                FamilyIndigenous = false,
                FamilyInformalSettler = false,
                DateOfAdmission = new DateOnly(2024, 9, 5),
                ReferralSource = "Court Order",
                ReferringAgencyPerson = "Regional Family Court",
                AssignedSocialWorker = "Maria Reyes",
                InitialCaseAssessment = "Stabilization and education continuity plan.",
                ReintegrationType = "Independent Living",
                ReintegrationStatus = "Not Started",
                InitialRiskLevel = "Critical",
                CurrentRiskLevel = "High",
                CreatedAtUtc = new DateTime(2024, 9, 5, 8, 0, 0, DateTimeKind.Utc)
            }
        };

        dbContext.Residents.AddRange(residents);
        await dbContext.SaveChangesAsync();

        dbContext.InterventionPlans.AddRange(
            new InterventionPlan
            {
                ResidentId = residents[0].Id,
                PlanCategory = "Psychosocial",
                PlanDescription = "Build emotional regulation strategies and trust in support network.",
                ServicesProvided = "Counseling, healing sessions",
                TargetValue = 4.0m,
                TargetDate = new DateOnly(2026, 6, 30),
                Status = "In Progress",
                CaseConferenceDate = new DateOnly(2025, 3, 12),
                CreatedAtUtc = new DateTime(2025, 3, 12, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new InterventionPlan
            {
                ResidentId = residents[1].Id,
                PlanCategory = "Education",
                PlanDescription = "Stabilize school attendance and complete literacy catch-up milestones.",
                ServicesProvided = "Teaching, tutoring, case conference follow-up",
                TargetValue = 85m,
                TargetDate = new DateOnly(2026, 5, 30),
                Status = "Open",
                CaseConferenceDate = new DateOnly(2026, 1, 18),
                CreatedAtUtc = new DateTime(2026, 1, 18, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAtUtc = new DateTime(2026, 1, 18, 0, 0, 0, DateTimeKind.Utc)
            });

        dbContext.ProcessRecordings.AddRange(
            new ProcessRecording
            {
                ResidentId = residents[0].Id,
                SessionDate = new DateOnly(2026, 3, 18),
                SocialWorker = "Ana Santos",
                SessionType = "Individual",
                SessionDurationMinutes = 50,
                EmotionalStateObserved = "Anxious",
                EmotionalStateEnd = "Hopeful",
                SessionNarrative = "Resident discussed school transitions and fear of setbacks.",
                InterventionsApplied = "Grounding exercise, strengths reflection, safety planning review.",
                FollowUpActions = "Coordinate with school support lead and schedule peer support group.",
                ProgressNoted = true,
                ConcernsFlagged = false,
                ReferralMade = false
            });

        dbContext.HomeVisitations.AddRange(
            new HomeVisitation
            {
                ResidentId = residents[0].Id,
                VisitDate = new DateOnly(2026, 3, 10),
                SocialWorker = "Ana Santos",
                VisitType = "Routine Follow-Up",
                LocationVisited = "Quezon City family apartment",
                FamilyMembersPresent = "Grandmother and older cousin",
                Purpose = "Assess readiness for weekend transition visit.",
                Observations = "Home environment stable, family requested additional check-ins.",
                FamilyCooperationLevel = "Cooperative",
                SafetyConcernsNoted = false,
                FollowUpNeeded = true,
                FollowUpNotes = "Confirm school transport and caregiver orientation.",
                VisitOutcome = "Favorable"
            });

        dbContext.IncidentReports.AddRange(
            new IncidentReport
            {
                ResidentId = residents[1].Id,
                SafehouseId = safehouses[1].Id,
                IncidentDate = new DateOnly(2026, 2, 20),
                IncidentType = "Behavioral",
                Severity = "Medium",
                Description = "Resident had a conflict with a peer during evening study period.",
                ResponseTaken = "Staff de-escalated, documented incident, and scheduled follow-up session.",
                Resolved = true,
                ResolutionDate = new DateOnly(2026, 2, 21),
                ReportedBy = "Maria Reyes",
                FollowUpRequired = true
            });

        dbContext.Donations.AddRange(
            new Donation
            {
                SupporterId = supporters[0].Id,
                DonationType = "Monetary",
                DonationDate = new DateOnly(2026, 3, 2),
                ChannelSource = "Direct",
                CurrencyCode = "USD",
                Amount = 250m,
                EstimatedValue = 250m,
                ImpactUnit = "pesos",
                IsRecurring = true,
                CampaignName = "Year-End Hope",
                Notes = "Monthly giving commitment."
            },
            new Donation
            {
                SupporterId = supporters[1].Id,
                DonationType = "Monetary",
                DonationDate = new DateOnly(2026, 3, 22),
                ChannelSource = "Event",
                CurrencyCode = "PHP",
                Amount = 50000m,
                EstimatedValue = 50000m,
                ImpactUnit = "pesos",
                IsRecurring = false,
                CampaignName = "Back to School",
                Notes = "Corporate partner event pledge."
            });

        await dbContext.SaveChangesAsync();

        var donations = await dbContext.Donations.OrderBy(x => x.Id).ToListAsync();
        dbContext.DonationAllocations.AddRange(
            new DonationAllocation
            {
                DonationId = donations[0].Id,
                SafehouseId = safehouses[0].Id,
                ProgramArea = "Wellbeing",
                AmountAllocated = 250m,
                AllocationDate = new DateOnly(2026, 3, 2),
                AllocationNotes = "Therapeutic supplies and counseling support."
            },
            new DonationAllocation
            {
                DonationId = donations[1].Id,
                SafehouseId = safehouses[1].Id,
                ProgramArea = "Education",
                AmountAllocated = 50000m,
                AllocationDate = new DateOnly(2026, 3, 23),
                AllocationNotes = "School fees and materials."
            });

        dbContext.SocialMediaPosts.AddRange(
            new SocialMediaPost
            {
                Platform = "Facebook",
                PlatformPostId = "fb_10001",
                PostUrl = "https://example.org/posts/fb_10001",
                CreatedAtUtc = new DateTime(2026, 3, 1, 14, 0, 0, DateTimeKind.Utc),
                PostType = "ImpactStory",
                MediaType = "Photo",
                Caption = "A month of progress across our safehouses.",
                Hashtags = "#HopeForGirls,#DonorImpact",
                HasCallToAction = true,
                CallToActionType = "DonateNow",
                ContentTopic = "DonorImpact",
                SentimentTone = "Hopeful",
                FeaturesResidentStory = false,
                CampaignName = "Year-End Hope",
                IsBoosted = true,
                BoostBudgetPhp = 2500m,
                Impressions = 12000,
                Reach = 8100,
                Likes = 430,
                Comments = 51,
                Shares = 74,
                ClickThroughs = 139,
                EngagementRate = 0.0685m,
                DonationReferrals = 7,
                EstimatedDonationValuePhp = 42000m
            });

        dbContext.PublicImpactSnapshots.AddRange(
            new PublicImpactSnapshot
            {
                SnapshotDate = new DateOnly(2026, 3, 1),
                Headline = "March impact highlights",
                SummaryText = "Two safehouses served active residents while education and healing plans continued across both sites.",
                MetricPayloadJson = JsonSerializer.Serialize(new[]
                {
                    new { label = "Active residents", value = "28" },
                    new { label = "Process recordings", value = "41" },
                    new { label = "Home visits", value = "12" },
                    new { label = "Donor-supported education plans", value = "19" }
                }),
                IsPublished = true,
                PublishedAt = new DateOnly(2026, 3, 31)
            });

        await dbContext.SaveChangesAsync();
    }

    private async Task SeedUsersAsync()
    {
        var users = new[]
        {
            new SeedUser("admin@intex.local", "Admin!234567", "Avery Admin", RoleNames.Admin, null),
            new SeedUser("staff@intex.local", "Staff!234567", "Skyler Staff", RoleNames.Staff, null),
            new SeedUser("donor@intex.local", "Donor!234567", "Jordan Lee", RoleNames.Donor,
                await dbContext.Supporters.Where(x => x.Email == "donor@intex.local").Select(x => (int?)x.Id).FirstAsync())
        };

        foreach (var seedUser in users)
        {
            // Query the entity set directly so repeated test-host startups stay idempotent,
            // even when the in-memory provider behaves differently than PostgreSQL.
            var user = await userManager.Users.FirstOrDefaultAsync(existingUser => existingUser.Email == seedUser.Email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName = seedUser.Email,
                    Email = seedUser.Email,
                    FullName = seedUser.FullName,
                    EmailConfirmed = true,
                    SupporterId = seedUser.SupporterId
                };

                var createResult = await userManager.CreateAsync(user, seedUser.Password);
                if (!createResult.Succeeded)
                {
                    throw new InvalidOperationException($"Failed to seed user {seedUser.Email}: {string.Join(", ", createResult.Errors.Select(x => x.Description))}");
                }
            }
            else
            {
                user.FullName = seedUser.FullName;
                user.SupporterId = seedUser.SupporterId;
                user.EmailConfirmed = true;
                await userManager.UpdateAsync(user);
            }

            if (!await userManager.IsInRoleAsync(user, seedUser.Role))
            {
                await userManager.AddToRoleAsync(user, seedUser.Role);
            }
        }
    }

    private sealed record SeedUser(string Email, string Password, string FullName, string Role, int? SupporterId);
}
