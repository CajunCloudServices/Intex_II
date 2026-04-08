using System.Text.Json;
using Intex.Api.Authorization;
using Intex.Api.Entities;
using Intex.Api.Models.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Intex.Api.Data.Seed;

public class AppSeeder(
    ApplicationDbContext dbContext,
    RoleManager<IdentityRole<Guid>> roleManager,
    UserManager<ApplicationUser> userManager,
    ICsvRelationalSeeder csvRelationalSeeder,
    IOptions<SeedOptions> seedOptions,
    ILogger<AppSeeder> logger)
{
    private readonly SeedOptions options = seedOptions.Value;

    public async Task SeedAsync()
    {
        // Roles must exist before user creation, because the seeded accounts are assigned
        // immediately after the domain rows are inserted.
        foreach (var roleName in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            }
        }

        if (!await dbContext.Safehouses.AnyAsync())
        {
            var preferCsv = string.Equals(options.Mode, "Csv", StringComparison.OrdinalIgnoreCase);
            if (preferCsv && options.ImportCsvOnStartup)
            {
                var importResult = await csvRelationalSeeder.SeedAsync();
                if (!importResult.Success)
                {
                    logger.LogWarning(
                        "CSV relational seed failed with {ErrorCount} errors; falling back to fixture seed.",
                        importResult.Errors.Count);
                    foreach (var error in importResult.Errors.Take(25))
                    {
                        logger.LogWarning("CSV seed error: {Error}", error);
                    }

                    await SeedDomainDataAsync();
                }
                else
                {
                    logger.LogInformation(
                        "CSV relational seed completed. Imported counts: {Counts}",
                        string.Join(", ", importResult.ImportedCounts.Select(x => $"{x.Key}={x.Value}")));
                }
            }
            else
            {
                await SeedDomainDataAsync();
            }
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
            },
            // Second individual donor — used for donor isolation tests.
            new Supporter
            {
                SupporterType = "MonetaryDonor",
                DisplayName = "Alex Rivera",
                FirstName = "Alex",
                LastName = "Rivera",
                RelationshipType = "Individual",
                Region = "Asia Pacific",
                Country = "Australia",
                Email = "donor2@intex.local",
                Phone = "555-0103",
                Status = "Active",
                FirstDonationDate = new DateOnly(2026, 1, 10),
                AcquisitionChannel = "SocialMedia",
                CreatedAtUtc = new DateTime(2026, 1, 10, 10, 0, 0, DateTimeKind.Utc)
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

        dbContext.CaseConferences.AddRange(
            new CaseConference
            {
                ResidentId = residents[0].Id,
                ConferenceDate = new DateOnly(2026, 4, 18),
                LeadWorker = "Ana Santos",
                Attendees = "Ana Santos, house parent, school liaison",
                Purpose = "Review transition readiness and align school support.",
                DecisionsMade = "Proceed with a supervised weekend family visit and maintain weekly counseling.",
                FollowUpActions = "Confirm transport, caregiver orientation, and post-visit debrief.",
                NextReviewDate = new DateOnly(2026, 5, 2),
                Status = "Scheduled"
            },
            new CaseConference
            {
                ResidentId = residents[1].Id,
                ConferenceDate = new DateOnly(2026, 4, 11),
                LeadWorker = "Maria Reyes",
                Attendees = "Maria Reyes, education lead, safehouse supervisor",
                Purpose = "Review literacy progress and behavior support response.",
                DecisionsMade = "Increase tutoring frequency and add a peer-support check-in twice weekly.",
                FollowUpActions = "Update intervention plan milestones and monitor classroom behavior for 30 days.",
                NextReviewDate = new DateOnly(2026, 5, 9),
                Status = "Completed"
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

        dbContext.HealthWellbeingRecords.AddRange(
            new HealthWellbeingRecord
            {
                ResidentId = residents[0].Id,
                RecordDate = new DateOnly(2026, 2, 15),
                GeneralHealthScore = 7.1m,
                NutritionScore = 7.4m,
                SleepQualityScore = 6.9m,
                EnergyLevelScore = 7.0m,
                HeightCm = 148m,
                WeightKg = 41.5m,
                Bmi = 18.9m,
                MedicalCheckupDone = true,
                DentalCheckupDone = true,
                PsychologicalCheckupDone = true,
                Notes = "Steady improvement with regular sleep schedule."
            },
            new HealthWellbeingRecord
            {
                ResidentId = residents[1].Id,
                RecordDate = new DateOnly(2026, 2, 15),
                GeneralHealthScore = 6.1m,
                NutritionScore = 6.3m,
                SleepQualityScore = 5.9m,
                EnergyLevelScore = 5.8m,
                HeightCm = 152m,
                WeightKg = 44.2m,
                Bmi = 19.1m,
                MedicalCheckupDone = true,
                DentalCheckupDone = false,
                PsychologicalCheckupDone = true,
                Notes = "Needs ongoing support for sleep quality."
            });

        dbContext.EducationRecords.AddRange(
            new EducationRecord
            {
                ResidentId = residents[0].Id,
                RecordDate = new DateOnly(2026, 2, 28),
                EducationLevel = "Grade 8",
                SchoolName = "Quezon Secondary School",
                EnrollmentStatus = "Enrolled",
                AttendanceRate = 92m,
                ProgressPercent = 78m,
                CompletionStatus = "In Progress",
                Notes = "Consistent attendance after transport support."
            },
            new EducationRecord
            {
                ResidentId = residents[1].Id,
                RecordDate = new DateOnly(2026, 2, 28),
                EducationLevel = "Grade 9",
                SchoolName = "Cebu Learning Center",
                EnrollmentStatus = "Enrolled",
                AttendanceRate = 84m,
                ProgressPercent = 64m,
                CompletionStatus = "In Progress",
                Notes = "Requires tutoring reinforcement in math."
            });

        dbContext.Partners.AddRange(
            new Partner
            {
                PartnerName = "City Health Outreach",
                PartnerType = "NGO",
                RoleType = "Healthcare",
                ContactName = "Lia Gomez",
                Email = "lia.gomez@example.org",
                Phone = "+63-2-555-0120",
                Region = "Luzon",
                Status = "Active",
                StartDate = new DateOnly(2025, 6, 1),
                Notes = "Supports monthly checkups and referrals."
            },
            new Partner
            {
                PartnerName = "BrightPath Learning Foundation",
                PartnerType = "Foundation",
                RoleType = "Education",
                ContactName = "Paulo Dizon",
                Email = "paulo.dizon@example.org",
                Phone = "+63-2-555-0168",
                Region = "Visayas",
                Status = "Active",
                StartDate = new DateOnly(2025, 9, 15),
                Notes = "Provides tutoring and school materials."
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
            },
            // Donor2-only donation — must not appear in donor1's my-history response.
            new Donation
            {
                SupporterId = supporters[2].Id,
                DonationType = "Monetary",
                DonationDate = new DateOnly(2026, 1, 15),
                ChannelSource = "SocialMedia",
                CurrencyCode = "AUD",
                Amount = 100m,
                EstimatedValue = 100m,
                ImpactUnit = "pesos",
                IsRecurring = false,
                CampaignName = "Back to School",
                Notes = "One-time online gift."
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
            },
            new DonationAllocation
            {
                DonationId = donations[2].Id,
                SafehouseId = safehouses[0].Id,
                ProgramArea = "Education",
                AmountAllocated = 100m,
                AllocationDate = new DateOnly(2026, 1, 16),
                AllocationNotes = "School supply contribution from donor2."
            });

        var partners = await dbContext.Partners.OrderBy(x => x.Id).ToListAsync();
        dbContext.PartnerAssignments.AddRange(
            new PartnerAssignment
            {
                PartnerId = partners[0].Id,
                SafehouseId = safehouses[0].Id,
                ProgramArea = "Health",
                AssignmentStart = new DateOnly(2025, 7, 1),
                ResponsibilityNotes = "Monthly on-site wellness rounds",
                IsPrimary = true,
                Status = "Active"
            },
            new PartnerAssignment
            {
                PartnerId = partners[1].Id,
                SafehouseId = safehouses[1].Id,
                ProgramArea = "Education",
                AssignmentStart = new DateOnly(2025, 10, 1),
                ResponsibilityNotes = "Academic catch-up workshops",
                IsPrimary = true,
                Status = "Active"
            });

        dbContext.SafehouseMonthlyMetrics.AddRange(
            // SH-01 — January 2026
            new SafehouseMonthlyMetric
            {
                SafehouseId = safehouses[0].Id,
                MonthStart = new DateOnly(2026, 1, 1),
                MonthEnd = new DateOnly(2026, 1, 31),
                ActiveResidents = 16,
                AvgEducationProgress = 68.0m,
                AvgHealthScore = 6.6m,
                ProcessRecordingCount = 18,
                HomeVisitationCount = 4,
                IncidentCount = 3,
                Notes = "January intake; several new residents settling in."
            },
            // SH-01 — February 2026
            new SafehouseMonthlyMetric
            {
                SafehouseId = safehouses[0].Id,
                MonthStart = new DateOnly(2026, 2, 1),
                MonthEnd = new DateOnly(2026, 2, 28),
                ActiveResidents = 17,
                AvgEducationProgress = 71.2m,
                AvgHealthScore = 6.8m,
                ProcessRecordingCount = 19,
                HomeVisitationCount = 5,
                IncidentCount = 2,
                Notes = "Education attendance improving after schedule stabilisation."
            },
            // SH-01 — March 2026
            new SafehouseMonthlyMetric
            {
                SafehouseId = safehouses[0].Id,
                MonthStart = new DateOnly(2026, 3, 1),
                MonthEnd = new DateOnly(2026, 3, 31),
                ActiveResidents = 18,
                AvgEducationProgress = 74.5m,
                AvgHealthScore = 7.0m,
                ProcessRecordingCount = 21,
                HomeVisitationCount = 6,
                IncidentCount = 2,
                Notes = "Stable month with moderate case activity."
            },
            // SH-02 — January 2026
            new SafehouseMonthlyMetric
            {
                SafehouseId = safehouses[1].Id,
                MonthStart = new DateOnly(2026, 1, 1),
                MonthEnd = new DateOnly(2026, 1, 31),
                ActiveResidents = 8,
                AvgEducationProgress = 61.5m,
                AvgHealthScore = 5.9m,
                ProcessRecordingCount = 13,
                HomeVisitationCount = 3,
                IncidentCount = 2,
                Notes = "Low staffing coverage; partner support gap."
            },
            // SH-02 — February 2026
            new SafehouseMonthlyMetric
            {
                SafehouseId = safehouses[1].Id,
                MonthStart = new DateOnly(2026, 2, 1),
                MonthEnd = new DateOnly(2026, 2, 28),
                ActiveResidents = 9,
                AvgEducationProgress = 64.8m,
                AvgHealthScore = 6.1m,
                ProcessRecordingCount = 15,
                HomeVisitationCount = 3,
                IncidentCount = 1,
                Notes = "Partner tutoring programme began mid-month."
            },
            // SH-02 — March 2026
            new SafehouseMonthlyMetric
            {
                SafehouseId = safehouses[1].Id,
                MonthStart = new DateOnly(2026, 3, 1),
                MonthEnd = new DateOnly(2026, 3, 31),
                ActiveResidents = 10,
                AvgEducationProgress = 68.2m,
                AvgHealthScore = 6.3m,
                ProcessRecordingCount = 17,
                HomeVisitationCount = 4,
                IncidentCount = 1,
                Notes = "Improving engagement with partner support."
            });

        dbContext.InKindDonationItems.AddRange(
            new InKindDonationItem
            {
                DonationId = donations[0].Id,
                ItemName = "Nutrition Pack",
                ItemCategory = "Food",
                Quantity = 20,
                UnitOfMeasure = "boxes",
                EstimatedUnitValue = 30m,
                IntendedUse = "Resident meal support",
                ReceivedCondition = "Good"
            },
            new InKindDonationItem
            {
                DonationId = donations[1].Id,
                ItemName = "School Supply Kit",
                ItemCategory = "Education",
                Quantity = 40,
                UnitOfMeasure = "kits",
                EstimatedUnitValue = 18.5m,
                IntendedUse = "Back-to-school distribution",
                ReceivedCondition = "New"
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
            },
            new SocialMediaPost
            {
                Platform = "Instagram",
                PlatformPostId = "ig_20001",
                PostUrl = "https://example.org/posts/ig_20001",
                CreatedAtUtc = new DateTime(2026, 3, 8, 10, 0, 0, DateTimeKind.Utc),
                PostType = "Appeal",
                MediaType = "Reel",
                Caption = "Every peso counts. Help us keep our safehouses running.",
                Hashtags = "#GiveHope,#BackToSchool",
                HasCallToAction = true,
                CallToActionType = "DonateNow",
                ContentTopic = "Fundraising",
                SentimentTone = "Urgent",
                FeaturesResidentStory = false,
                CampaignName = "Back to School",
                IsBoosted = true,
                BoostBudgetPhp = 1800m,
                Impressions = 18500,
                Reach = 13200,
                Likes = 780,
                Comments = 94,
                Shares = 210,
                ClickThroughs = 312,
                EngagementRate = 0.0588m,
                DonationReferrals = 14,
                EstimatedDonationValuePhp = 78000m
            },
            new SocialMediaPost
            {
                Platform = "Facebook",
                PlatformPostId = "fb_10002",
                PostUrl = "https://example.org/posts/fb_10002",
                CreatedAtUtc = new DateTime(2026, 2, 14, 9, 0, 0, DateTimeKind.Utc),
                PostType = "EventPromo",
                MediaType = "Photo",
                Caption = "Join us for our February fundraising evening.",
                Hashtags = "#TanglawProjectEvent,#HopeForGirls",
                HasCallToAction = true,
                CallToActionType = "RegisterNow",
                ContentTopic = "Events",
                SentimentTone = "Celebratory",
                FeaturesResidentStory = false,
                CampaignName = "Year-End Hope",
                IsBoosted = false,
                Impressions = 5400,
                Reach = 3900,
                Likes = 182,
                Comments = 23,
                Shares = 38,
                ClickThroughs = 64,
                EngagementRate = 0.0452m,
                DonationReferrals = 3,
                EstimatedDonationValuePhp = 18500m
            },
            new SocialMediaPost
            {
                Platform = "Instagram",
                PlatformPostId = "ig_20002",
                PostUrl = "https://example.org/posts/ig_20002",
                CreatedAtUtc = new DateTime(2026, 2, 5, 11, 30, 0, DateTimeKind.Utc),
                PostType = "ImpactStory",
                MediaType = "Photo",
                Caption = "What does resilience look like? It looks like this.",
                Hashtags = "#DonorImpact,#SafeHaven",
                HasCallToAction = false,
                ContentTopic = "DonorImpact",
                SentimentTone = "Hopeful",
                FeaturesResidentStory = true,
                IsBoosted = false,
                Impressions = 9700,
                Reach = 7200,
                Likes = 620,
                Comments = 77,
                Shares = 91,
                ClickThroughs = 48,
                EngagementRate = 0.0812m,
                DonationReferrals = 5,
                EstimatedDonationValuePhp = 29000m
            },
            new SocialMediaPost
            {
                Platform = "Facebook",
                PlatformPostId = "fb_10003",
                PostUrl = "https://example.org/posts/fb_10003",
                CreatedAtUtc = new DateTime(2026, 1, 20, 8, 0, 0, DateTimeKind.Utc),
                PostType = "Appeal",
                MediaType = "Video",
                Caption = "Our girls are heading back to school. Can you help?",
                Hashtags = "#BackToSchool,#HopeForGirls",
                HasCallToAction = true,
                CallToActionType = "DonateNow",
                ContentTopic = "Education",
                SentimentTone = "Hopeful",
                FeaturesResidentStory = false,
                CampaignName = "Back to School",
                IsBoosted = true,
                BoostBudgetPhp = 3000m,
                Impressions = 22000,
                Reach = 15800,
                Likes = 910,
                Comments = 118,
                Shares = 265,
                ClickThroughs = 407,
                EngagementRate = 0.0590m,
                DonationReferrals = 18,
                EstimatedDonationValuePhp = 95000m
            },
            new SocialMediaPost
            {
                Platform = "Instagram",
                PlatformPostId = "ig_20003",
                PostUrl = "https://example.org/posts/ig_20003",
                CreatedAtUtc = new DateTime(2026, 1, 10, 12, 0, 0, DateTimeKind.Utc),
                PostType = "PartnerSpotlight",
                MediaType = "Photo",
                Caption = "Thank you to our partners who make every day possible.",
                Hashtags = "#ThankYou,#CommunityImpact",
                HasCallToAction = false,
                ContentTopic = "Partnerships",
                SentimentTone = "Grateful",
                FeaturesResidentStory = false,
                IsBoosted = false,
                Impressions = 4200,
                Reach = 3100,
                Likes = 245,
                Comments = 19,
                Shares = 31,
                ClickThroughs = 22,
                EngagementRate = 0.0702m,
                DonationReferrals = 1,
                EstimatedDonationValuePhp = 5000m
            });

        // SnapshotDate = first day of the reporting month (see PublicImpactSnapshot). Copy and headline describe that month.
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
        var donorSupporterId = await dbContext.Supporters
            .Where(x => x.Email == "donor@intex.local")
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync();

        var donor2SupporterId = await dbContext.Supporters
            .Where(x => x.Email == "donor2@intex.local")
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync();

        if (!donorSupporterId.HasValue)
        {
            var fallbackDonor = new Supporter
            {
                SupporterType = "MonetaryDonor",
                DisplayName = "Jordan Lee",
                FirstName = "Jordan",
                LastName = "Lee",
                RelationshipType = "International",
                Region = "Luzon",
                Country = "Philippines",
                Email = "donor@intex.local",
                Status = "Active",
                AcquisitionChannel = "SystemSeed",
                CreatedAtUtc = DateTime.UtcNow
            };
            dbContext.Supporters.Add(fallbackDonor);
            await dbContext.SaveChangesAsync();
            donorSupporterId = fallbackDonor.Id;
        }

        // These seeded users are for local/demo verification. Production deployments should
        // replace them with real admin-managed accounts and stronger secrets.
        var users = new[]
        {
            new SeedUser("admin@intex.local", "Admin!234567", "Avery Admin", RoleNames.Admin, null),
            new SeedUser("staff@intex.local", "Staff!234567", "Skyler Staff", RoleNames.Staff, null),
            new SeedUser("donor@intex.local", "Donor!234567", "Jordan Lee", RoleNames.Donor, donorSupporterId),
            new SeedUser("donor2@intex.local", "Donor2!234567", "Alex Rivera", RoleNames.Donor, donor2SupporterId)
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
