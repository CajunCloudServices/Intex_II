using Intex.Api.Data;
using Intex.Api.Entities;
using Intex.Api.Models.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using static Intex.Api.Data.Seed.CsvSeedSupport;

namespace Intex.Api.Data.Seed;

public sealed class CsvOperationalBackfillImporter(
    ApplicationDbContext dbContext,
    IOptions<SeedOptions> seedOptions,
    IHostEnvironment hostEnvironment,
    ILogger<CsvOperationalBackfillImporter> logger) : ICsvOperationalBackfillImporter
{
    private readonly SeedOptions options = seedOptions.Value;

    public async Task<CsvBackfillResult> BackfillAsync(CancellationToken cancellationToken = default)
    {
        var insertedCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var matchedCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var warnings = new List<string>();
        var errors = new List<string>();
        var csvRoot = ResolveCsvRoot(options, hostEnvironment);

        logger.LogInformation("CSV operational backfill starting from directory {CsvRoot}.", csvRoot);
        errors.AddRange(ValidateRequiredFiles(csvRoot));
        if (errors.Count > 0)
        {
            return new CsvBackfillResult(false, csvRoot, insertedCounts, matchedCounts, warnings, errors);
        }

        if (dbContext.Database.IsRelational())
        {
            var strategy = dbContext.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    await RunBackfillAsync(csvRoot, insertedCounts, matchedCounts, warnings, errors, cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    errors.Add($"CSV operational backfill failed: {ex.Message}");
                    logger.LogError(ex, "CSV operational backfill failed.");
                }
            });
        }
        else
        {
            try
            {
                await RunBackfillAsync(csvRoot, insertedCounts, matchedCounts, warnings, errors, cancellationToken);
            }
            catch (Exception ex)
            {
                errors.Add($"CSV operational backfill failed: {ex.Message}");
                logger.LogError(ex, "CSV operational backfill failed.");
            }
        }

        if (errors.Count == 0)
        {
            logger.LogInformation(
                "CSV operational backfill completed. Inserted: {Inserted}; matched existing: {Matched}; warnings: {WarningCount}",
                string.Join(", ", insertedCounts.Select(x => $"{x.Key}={x.Value}")),
                string.Join(", ", matchedCounts.Select(x => $"{x.Key}={x.Value}")),
                warnings.Count);
        }

        return new CsvBackfillResult(errors.Count == 0, csvRoot, insertedCounts, matchedCounts, warnings, errors);
    }

    private async Task RunBackfillAsync(
        string csvRoot,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        ICollection<string> errors,
        CancellationToken cancellationToken)
    {
        var safehouseMap = await BackfillSafehousesAsync(csvRoot, insertedCounts, matchedCounts, warnings, cancellationToken);
        var partnerMap = await BackfillPartnersAsync(csvRoot, insertedCounts, matchedCounts, warnings, cancellationToken);
        var supporterMap = await BackfillSupportersAsync(csvRoot, insertedCounts, matchedCounts, warnings, cancellationToken);
        var socialPostCount = await BackfillSocialPostsAsync(csvRoot, warnings, cancellationToken);
        insertedCounts["social_media_posts"] = socialPostCount.Inserted;
        matchedCounts["social_media_posts"] = socialPostCount.Matched;

        var residentMap = await BackfillResidentsAsync(csvRoot, safehouseMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        var donationMap = await BackfillDonationsAsync(csvRoot, supporterMap, insertedCounts, matchedCounts, warnings, cancellationToken);

        await BackfillPartnerAssignmentsAsync(csvRoot, partnerMap, safehouseMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillDonationAllocationsAsync(csvRoot, donationMap, safehouseMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillInKindDonationItemsAsync(csvRoot, donationMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillEducationRecordsAsync(csvRoot, residentMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillHealthRecordsAsync(csvRoot, residentMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillInterventionPlansAsync(csvRoot, residentMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillIncidentReportsAsync(csvRoot, residentMap, safehouseMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillHomeVisitationsAsync(csvRoot, residentMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillProcessRecordingsAsync(csvRoot, residentMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillSafehouseMonthlyMetricsAsync(csvRoot, safehouseMap, insertedCounts, matchedCounts, warnings, cancellationToken);
        await BackfillPublicImpactSnapshotsAsync(csvRoot, insertedCounts, matchedCounts, cancellationToken);

        foreach (var warning in warnings.Take(25))
        {
            logger.LogWarning("CSV backfill warning: {Warning}", warning);
        }
    }

    private async Task<Dictionary<int, int>> BackfillSafehousesAsync(
        string csvRoot,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingByCode = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var safehouse in await dbContext.Safehouses.AsNoTracking().ToListAsync(cancellationToken))
        {
            var key = NormalizeKey(safehouse.Code);
            if (key is not null && !existingByCode.ContainsKey(key))
            {
                existingByCode[key] = safehouse.Id;
            }
        }

        var csvToDb = new Dictionary<int, int>();
        var pending = new List<(int CsvId, string Key, Safehouse Entity)>();
        var matched = 0;

        foreach (var row in ReadRows(Path.Combine(csvRoot, "safehouses.csv")))
        {
            var csvId = GetInt(row, "safehouse_id");
            if (!csvId.HasValue)
            {
                warnings.Add("Skipped safehouses row with missing safehouse_id.");
                continue;
            }

            var code = GetString(row, "safehouse_code", $"SH-{csvId.Value:D4}");
            var key = NormalizeKey(code);
            if (key is null)
            {
                warnings.Add($"Skipped safehouses.safehouse_id={csvId.Value} due to missing code.");
                continue;
            }

            if (existingByCode.TryGetValue(key, out var existingId))
            {
                csvToDb[csvId.Value] = existingId;
                matched++;
                continue;
            }

            pending.Add((csvId.Value, key, new Safehouse
            {
                Code = code,
                Name = GetString(row, "name", "Unknown"),
                Region = GetString(row, "region", "Unknown"),
                City = GetString(row, "city", "Unknown"),
                Province = GetString(row, "province", "Unknown"),
                Country = GetString(row, "country", "Philippines"),
                OpenDate = GetDateOnly(row, "open_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                Status = GetString(row, "status", "Active"),
                CapacityGirls = GetInt(row, "capacity_girls") ?? 0,
                CapacityStaff = GetInt(row, "capacity_staff") ?? 0,
                CurrentOccupancy = GetInt(row, "current_occupancy") ?? 0,
                Notes = GetNullableString(row, "notes")
            }));
            existingByCode[key] = -1;
        }

        if (pending.Count > 0)
        {
            dbContext.Safehouses.AddRange(pending.Select(x => x.Entity));
            await dbContext.SaveChangesAsync(cancellationToken);
            foreach (var row in pending)
            {
                csvToDb[row.CsvId] = row.Entity.Id;
                existingByCode[row.Key] = row.Entity.Id;
            }
        }

        insertedCounts["safehouses"] = pending.Count;
        matchedCounts["safehouses"] = matched;
        return csvToDb;
    }

    private async Task<Dictionary<int, int>> BackfillPartnersAsync(
        string csvRoot,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingByName = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var partner in await dbContext.Partners.AsNoTracking().ToListAsync(cancellationToken))
        {
            var key = NormalizeKey(partner.PartnerName);
            if (key is not null && !existingByName.ContainsKey(key))
            {
                existingByName[key] = partner.Id;
            }
        }

        var csvToDb = new Dictionary<int, int>();
        var pending = new List<(int CsvId, string Key, Partner Entity)>();
        var matched = 0;

        foreach (var row in ReadRows(Path.Combine(csvRoot, "partners.csv")))
        {
            var csvId = GetInt(row, "partner_id");
            if (!csvId.HasValue)
            {
                warnings.Add("Skipped partners row with missing partner_id.");
                continue;
            }

            var partnerName = GetString(row, "partner_name", $"Partner {csvId.Value}");
            var key = NormalizeKey(partnerName);
            if (key is null)
            {
                warnings.Add($"Skipped partners.partner_id={csvId.Value} due to missing partner_name.");
                continue;
            }

            if (existingByName.TryGetValue(key, out var existingId))
            {
                csvToDb[csvId.Value] = existingId;
                matched++;
                continue;
            }

            pending.Add((csvId.Value, key, new Partner
            {
                PartnerName = partnerName,
                PartnerType = GetString(row, "partner_type", "Unknown"),
                RoleType = GetString(row, "role_type", "Unknown"),
                ContactName = GetNullableString(row, "contact_name"),
                Email = GetNullableString(row, "email"),
                Phone = GetNullableString(row, "phone"),
                Region = GetString(row, "region", "Unknown"),
                Status = GetString(row, "status", "Active"),
                StartDate = GetDateOnly(row, "start_date"),
                EndDate = GetDateOnly(row, "end_date"),
                Notes = GetNullableString(row, "notes")
            }));
            existingByName[key] = -1;
        }

        if (pending.Count > 0)
        {
            dbContext.Partners.AddRange(pending.Select(x => x.Entity));
            await dbContext.SaveChangesAsync(cancellationToken);
            foreach (var row in pending)
            {
                csvToDb[row.CsvId] = row.Entity.Id;
                existingByName[row.Key] = row.Entity.Id;
            }
        }

        insertedCounts["partners"] = pending.Count;
        matchedCounts["partners"] = matched;
        return csvToDb;
    }

    private async Task<Dictionary<int, int>> BackfillSupportersAsync(
        string csvRoot,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingByEmail = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var supporter in await dbContext.Supporters.AsNoTracking().ToListAsync(cancellationToken))
        {
            var key = NormalizeKey(supporter.Email);
            if (key is not null && !existingByEmail.ContainsKey(key))
            {
                existingByEmail[key] = supporter.Id;
            }
        }

        var csvToDb = new Dictionary<int, int>();
        var pending = new List<(int CsvId, string Key, Supporter Entity)>();
        var matched = 0;

        foreach (var row in ReadRows(Path.Combine(csvRoot, "supporters.csv")))
        {
            var csvId = GetInt(row, "supporter_id");
            if (!csvId.HasValue)
            {
                warnings.Add("Skipped supporters row with missing supporter_id.");
                continue;
            }

            var email = GetNullableString(row, "email");
            if (string.IsNullOrWhiteSpace(email))
            {
                email = $"csv-supporter-{csvId.Value}@intex.import";
                warnings.Add($"supporters.supporter_id={csvId.Value} had no email; assigned deterministic import email {email}.");
            }

            var key = NormalizeKey(email);
            if (key is null)
            {
                warnings.Add($"Skipped supporters.supporter_id={csvId.Value} due to unusable email.");
                continue;
            }

            if (existingByEmail.TryGetValue(key, out var existingId))
            {
                csvToDb[csvId.Value] = existingId;
                matched++;
                continue;
            }

            pending.Add((csvId.Value, key, new Supporter
            {
                SupporterType = GetString(row, "supporter_type", "Unknown"),
                DisplayName = GetString(row, "display_name", "Unknown"),
                OrganizationName = GetNullableString(row, "organization_name"),
                FirstName = GetNullableString(row, "first_name"),
                LastName = GetNullableString(row, "last_name"),
                RelationshipType = GetString(row, "relationship_type", "Unknown"),
                Region = GetString(row, "region", "Unknown"),
                Country = GetString(row, "country", "Unknown"),
                Email = email,
                Phone = GetNullableString(row, "phone"),
                Status = GetString(row, "status", "Active"),
                FirstDonationDate = GetDateOnly(row, "first_donation_date"),
                AcquisitionChannel = GetString(row, "acquisition_channel", "Unknown"),
                CreatedAtUtc = GetDateTime(row, "created_at") ?? DateTime.UtcNow
            }));
            existingByEmail[key] = -1;
        }

        if (pending.Count > 0)
        {
            dbContext.Supporters.AddRange(pending.Select(x => x.Entity));
            await dbContext.SaveChangesAsync(cancellationToken);
            foreach (var row in pending)
            {
                csvToDb[row.CsvId] = row.Entity.Id;
                existingByEmail[row.Key] = row.Entity.Id;
            }
        }

        insertedCounts["supporters"] = pending.Count;
        matchedCounts["supporters"] = matched;
        return csvToDb;
    }

    private async Task<(int Inserted, int Matched)> BackfillSocialPostsAsync(
        string csvRoot,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var post in await dbContext.SocialMediaPosts.AsNoTracking().ToListAsync(cancellationToken))
        {
            var key = BuildSocialPostKey(post.PlatformPostId, post.PostUrl);
            if (key is not null)
            {
                existingKeys.Add(key);
            }
        }

        var pending = new List<SocialMediaPost>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "social_media_posts.csv")))
        {
            var key = BuildSocialPostKey(GetString(row, "platform_post_id", string.Empty), GetString(row, "post_url", string.Empty));
            if (key is null)
            {
                warnings.Add($"Skipped social_media_posts.post_id={GetInt(row, "post_id")} due to missing platform_post_id and post_url.");
                continue;
            }

            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new SocialMediaPost
            {
                Platform = GetString(row, "platform", "Unknown"),
                PlatformPostId = GetString(row, "platform_post_id", string.Empty),
                PostUrl = GetString(row, "post_url", string.Empty),
                CreatedAtUtc = GetDateTime(row, "created_at") ?? DateTime.UtcNow,
                PostType = GetString(row, "post_type", "Unknown"),
                MediaType = GetString(row, "media_type", "Unknown"),
                Caption = GetString(row, "caption", string.Empty),
                Hashtags = GetNullableString(row, "hashtags"),
                HasCallToAction = GetBool(row, "has_call_to_action"),
                CallToActionType = GetNullableString(row, "call_to_action_type"),
                ContentTopic = GetString(row, "content_topic", "Unknown"),
                SentimentTone = GetString(row, "sentiment_tone", "Unknown"),
                FeaturesResidentStory = GetBool(row, "features_resident_story"),
                CampaignName = GetNullableString(row, "campaign_name"),
                IsBoosted = GetBool(row, "is_boosted"),
                BoostBudgetPhp = GetDecimal(row, "boost_budget_php"),
                Impressions = GetInt(row, "impressions") ?? 0,
                Reach = GetInt(row, "reach") ?? 0,
                Likes = GetInt(row, "likes") ?? 0,
                Comments = GetInt(row, "comments") ?? 0,
                Shares = GetInt(row, "shares") ?? 0,
                ClickThroughs = GetInt(row, "click_throughs") ?? 0,
                EngagementRate = GetDecimal(row, "engagement_rate") ?? 0m,
                DonationReferrals = GetInt(row, "donation_referrals") ?? 0,
                EstimatedDonationValuePhp = GetDecimal(row, "estimated_donation_value_php") ?? 0m
            });
            existingKeys.Add(key);
        }

        if (pending.Count > 0)
        {
            dbContext.SocialMediaPosts.AddRange(pending);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return (pending.Count, matched);
    }

    private async Task<Dictionary<int, int>> BackfillResidentsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> safehouseMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingByCode = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var resident in await dbContext.Residents.AsNoTracking().ToListAsync(cancellationToken))
        {
            var key = NormalizeKey(resident.CaseControlNumber);
            if (key is not null && !existingByCode.ContainsKey(key))
            {
                existingByCode[key] = resident.Id;
            }
        }

        var csvToDb = new Dictionary<int, int>();
        var pending = new List<(int CsvId, string Key, Resident Entity)>();
        var matched = 0;

        foreach (var row in ReadRows(Path.Combine(csvRoot, "residents.csv")))
        {
            var csvId = GetInt(row, "resident_id");
            if (!csvId.HasValue)
            {
                warnings.Add("Skipped residents row with missing resident_id.");
                continue;
            }

            var safehouseCsvId = GetInt(row, "safehouse_id");
            if (!safehouseCsvId.HasValue || !safehouseMap.TryGetValue(safehouseCsvId.Value, out var safehouseId))
            {
                warnings.Add($"Skipped residents.resident_id={csvId.Value} because safehouse_id={safehouseCsvId} could not be mapped.");
                continue;
            }

            var caseControlNumber = GetString(row, "case_control_no", string.Empty);
            var key = NormalizeKey(caseControlNumber);
            if (key is null)
            {
                warnings.Add($"Skipped residents.resident_id={csvId.Value} due to missing case_control_no.");
                continue;
            }

            if (existingByCode.TryGetValue(key, out var existingId))
            {
                csvToDb[csvId.Value] = existingId;
                matched++;
                continue;
            }

            pending.Add((csvId.Value, key, new Resident
            {
                CaseControlNumber = caseControlNumber,
                InternalCode = GetString(row, "internal_code", string.Empty),
                SafehouseId = safehouseId,
                CaseStatus = GetString(row, "case_status", "Active"),
                Sex = GetString(row, "sex", "F"),
                DateOfBirth = GetDateOnly(row, "date_of_birth") ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-16)),
                BirthStatus = GetString(row, "birth_status", "Unknown"),
                PlaceOfBirth = GetString(row, "place_of_birth", "Unknown"),
                Religion = GetString(row, "religion", "Unspecified"),
                CaseCategory = GetString(row, "case_category", "Unknown"),
                SubCatOrphaned = GetBool(row, "sub_cat_orphaned"),
                IsTrafficked = GetBool(row, "sub_cat_trafficked"),
                SubCatChildLabor = GetBool(row, "sub_cat_child_labor"),
                IsPhysicalAbuseCase = GetBool(row, "sub_cat_physical_abuse"),
                IsSexualAbuseCase = GetBool(row, "sub_cat_sexual_abuse"),
                SubCatOsaec = GetBool(row, "sub_cat_osaec"),
                SubCatCicl = GetBool(row, "sub_cat_cicl"),
                SubCatAtRisk = GetBool(row, "sub_cat_at_risk"),
                SubCatStreetChild = GetBool(row, "sub_cat_street_child"),
                SubCatChildWithHiv = GetBool(row, "sub_cat_child_with_hiv"),
                IsPwd = GetBool(row, "is_pwd"),
                PwdType = GetNullableString(row, "pwd_type"),
                HasSpecialNeeds = GetBool(row, "has_special_needs"),
                SpecialNeedsDiagnosis = GetNullableString(row, "special_needs_diagnosis"),
                FamilyIs4Ps = GetBool(row, "family_is_4ps"),
                FamilySoloParent = GetBool(row, "family_solo_parent"),
                FamilyIndigenous = GetBool(row, "family_indigenous"),
                FamilyParentPwd = GetBool(row, "family_parent_pwd"),
                FamilyInformalSettler = GetBool(row, "family_informal_settler"),
                DateOfAdmission = GetDateOnly(row, "date_of_admission") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                ReferralSource = GetString(row, "referral_source", "Unknown"),
                ReferringAgencyPerson = GetNullableString(row, "referring_agency_person"),
                DateColbRegistered = GetDateOnly(row, "date_colb_registered"),
                DateColbObtained = GetDateOnly(row, "date_colb_obtained"),
                AssignedSocialWorker = GetString(row, "assigned_social_worker", "Unknown"),
                InitialCaseAssessment = GetString(row, "initial_case_assessment", string.Empty),
                DateCaseStudyPrepared = GetDateOnly(row, "date_case_study_prepared"),
                ReintegrationType = GetNullableString(row, "reintegration_type"),
                ReintegrationStatus = GetNullableString(row, "reintegration_status"),
                InitialRiskLevel = GetString(row, "initial_risk_level", "Medium"),
                CurrentRiskLevel = GetString(row, "current_risk_level", "Medium"),
                DateEnrolled = GetDateOnly(row, "date_enrolled"),
                DateClosed = GetDateOnly(row, "date_closed"),
                CreatedAtUtc = GetDateTime(row, "created_at") ?? DateTime.UtcNow,
                RestrictedNotes = GetNullableString(row, "notes_restricted")
            }));
            existingByCode[key] = -1;
        }

        if (pending.Count > 0)
        {
            dbContext.Residents.AddRange(pending.Select(x => x.Entity));
            await dbContext.SaveChangesAsync(cancellationToken);
            foreach (var row in pending)
            {
                csvToDb[row.CsvId] = row.Entity.Id;
                existingByCode[row.Key] = row.Entity.Id;
            }
        }

        insertedCounts["residents"] = pending.Count;
        matchedCounts["residents"] = matched;
        return csvToDb;
    }

    private async Task<Dictionary<int, int>> BackfillDonationsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> supporterMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingByKey = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var donation in await dbContext.Donations.AsNoTracking().ToListAsync(cancellationToken))
        {
            var key = BuildDonationKey(
                donation.SupporterId,
                donation.DonationType,
                donation.DonationDate,
                donation.ChannelSource,
                donation.CurrencyCode,
                donation.Amount,
                donation.EstimatedValue,
                donation.IsRecurring,
                donation.CampaignName);
            if (!existingByKey.ContainsKey(key))
            {
                existingByKey[key] = donation.Id;
            }
        }

        var csvToDb = new Dictionary<int, int>();
        var pending = new List<(int CsvId, string Key, Donation Entity)>();
        var matched = 0;

        foreach (var row in ReadRows(Path.Combine(csvRoot, "donations.csv")))
        {
            var csvId = GetInt(row, "donation_id");
            var supporterCsvId = GetInt(row, "supporter_id");
            if (!csvId.HasValue || !supporterCsvId.HasValue || !supporterMap.TryGetValue(supporterCsvId.Value, out var supporterId))
            {
                warnings.Add($"Skipped donations.donation_id={csvId} because supporter_id={supporterCsvId} could not be mapped.");
                continue;
            }

            var donationDate = GetDateOnly(row, "donation_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var amount = GetDecimal(row, "amount");
            var estimatedValue = GetDecimal(row, "estimated_value") ?? amount ?? 0m;
            var key = BuildDonationKey(
                supporterId,
                GetString(row, "donation_type", "Unknown"),
                donationDate,
                GetString(row, "channel_source", "Unknown"),
                GetNullableString(row, "currency_code"),
                amount,
                estimatedValue,
                GetBool(row, "is_recurring"),
                GetNullableString(row, "campaign_name"));

            if (existingByKey.TryGetValue(key, out var existingId))
            {
                csvToDb[csvId.Value] = existingId;
                matched++;
                continue;
            }

            pending.Add((csvId.Value, key, new Donation
            {
                SupporterId = supporterId,
                DonationType = GetString(row, "donation_type", "Unknown"),
                DonationDate = donationDate,
                ChannelSource = GetString(row, "channel_source", "Unknown"),
                CurrencyCode = GetNullableString(row, "currency_code"),
                Amount = amount,
                EstimatedValue = estimatedValue,
                ImpactUnit = GetString(row, "impact_unit", "unit"),
                IsRecurring = GetBool(row, "is_recurring"),
                CampaignName = GetNullableString(row, "campaign_name"),
                Notes = GetNullableString(row, "notes")
            }));
            existingByKey[key] = -1;
        }

        if (pending.Count > 0)
        {
            dbContext.Donations.AddRange(pending.Select(x => x.Entity));
            await dbContext.SaveChangesAsync(cancellationToken);
            foreach (var row in pending)
            {
                csvToDb[row.CsvId] = row.Entity.Id;
                existingByKey[row.Key] = row.Entity.Id;
            }
        }

        insertedCounts["donations"] = pending.Count;
        matchedCounts["donations"] = matched;
        return csvToDb;
    }

    private async Task BackfillPartnerAssignmentsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> partnerMap,
        IReadOnlyDictionary<int, int> safehouseMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var assignment in await dbContext.PartnerAssignments.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(assignment.PartnerId, assignment.SafehouseId, assignment.ProgramArea, assignment.AssignmentStart));
        }

        var pending = new List<PartnerAssignment>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "partner_assignments.csv")))
        {
            var partnerCsvId = GetInt(row, "partner_id");
            var safehouseCsvId = GetInt(row, "safehouse_id");
            if (!partnerCsvId.HasValue || !safehouseCsvId.HasValue ||
                !partnerMap.TryGetValue(partnerCsvId.Value, out var partnerId) ||
                !safehouseMap.TryGetValue(safehouseCsvId.Value, out var safehouseId))
            {
                warnings.Add($"Skipped partner_assignments.assignment_id={GetInt(row, "assignment_id")} because partner/safehouse mapping was missing.");
                continue;
            }

            var assignmentStart = GetDateOnly(row, "assignment_start");
            var key = NormalizeCompositeKey(partnerId, safehouseId, GetString(row, "program_area", "General"), assignmentStart);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new PartnerAssignment
            {
                PartnerId = partnerId,
                SafehouseId = safehouseId,
                ProgramArea = GetString(row, "program_area", "General"),
                AssignmentStart = assignmentStart,
                AssignmentEnd = GetDateOnly(row, "assignment_end"),
                ResponsibilityNotes = GetNullableString(row, "responsibility_notes"),
                IsPrimary = GetBool(row, "is_primary"),
                Status = GetString(row, "status", "Active")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["partner_assignments"] = pending.Count;
        matchedCounts["partner_assignments"] = matched;
    }

    private async Task BackfillDonationAllocationsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> donationMap,
        IReadOnlyDictionary<int, int> safehouseMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var allocation in await dbContext.DonationAllocations.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(allocation.DonationId, allocation.SafehouseId, allocation.ProgramArea, allocation.AllocationDate, allocation.AmountAllocated));
        }

        var pending = new List<DonationAllocation>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "donation_allocations.csv")))
        {
            var donationCsvId = GetInt(row, "donation_id");
            var safehouseCsvId = GetInt(row, "safehouse_id");
            if (!donationCsvId.HasValue || !safehouseCsvId.HasValue ||
                !donationMap.TryGetValue(donationCsvId.Value, out var donationId) ||
                !safehouseMap.TryGetValue(safehouseCsvId.Value, out var safehouseId))
            {
                warnings.Add($"Skipped donation_allocations.allocation_id={GetInt(row, "allocation_id")} because donation/safehouse mapping was missing.");
                continue;
            }

            var allocationDate = GetDateOnly(row, "allocation_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var amountAllocated = GetDecimal(row, "amount_allocated") ?? 0m;
            var key = NormalizeCompositeKey(donationId, safehouseId, GetString(row, "program_area", "General"), allocationDate, amountAllocated);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new DonationAllocation
            {
                DonationId = donationId,
                SafehouseId = safehouseId,
                ProgramArea = GetString(row, "program_area", "General"),
                AmountAllocated = amountAllocated,
                AllocationDate = allocationDate,
                AllocationNotes = GetNullableString(row, "allocation_notes")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["donation_allocations"] = pending.Count;
        matchedCounts["donation_allocations"] = matched;
    }

    private async Task BackfillInKindDonationItemsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> donationMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in await dbContext.InKindDonationItems.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(item.DonationId, item.ItemName, item.ItemCategory, item.Quantity, item.UnitOfMeasure));
        }

        var pending = new List<InKindDonationItem>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "in_kind_donation_items.csv")))
        {
            var donationCsvId = GetInt(row, "donation_id");
            if (!donationCsvId.HasValue || !donationMap.TryGetValue(donationCsvId.Value, out var donationId))
            {
                warnings.Add($"Skipped in_kind_donation_items.item_id={GetInt(row, "item_id")} because donation mapping was missing.");
                continue;
            }

            var quantity = GetDecimal(row, "quantity") ?? 0m;
            var key = NormalizeCompositeKey(donationId, GetString(row, "item_name", "Unknown item"), GetString(row, "item_category", "Other"), quantity, GetString(row, "unit_of_measure", "units"));
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new InKindDonationItem
            {
                DonationId = donationId,
                ItemName = GetString(row, "item_name", "Unknown item"),
                ItemCategory = GetString(row, "item_category", "Other"),
                Quantity = quantity,
                UnitOfMeasure = GetString(row, "unit_of_measure", "units"),
                EstimatedUnitValue = GetDecimal(row, "estimated_unit_value"),
                IntendedUse = GetNullableString(row, "intended_use"),
                ReceivedCondition = GetNullableString(row, "received_condition")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["in_kind_donation_items"] = pending.Count;
        matchedCounts["in_kind_donation_items"] = matched;
    }

    private async Task BackfillEducationRecordsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> residentMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var record in await dbContext.EducationRecords.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(record.ResidentId, record.RecordDate, record.EducationLevel, record.SchoolName));
        }

        var pending = new List<EducationRecord>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "education_records.csv")))
        {
            var residentCsvId = GetInt(row, "resident_id");
            if (!residentCsvId.HasValue || !residentMap.TryGetValue(residentCsvId.Value, out var residentId))
            {
                warnings.Add($"Skipped education_records.education_record_id={GetInt(row, "education_record_id")} because resident mapping was missing.");
                continue;
            }

            var recordDate = GetDateOnly(row, "record_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var key = NormalizeCompositeKey(residentId, recordDate, GetString(row, "education_level", "Unknown"), GetNullableString(row, "school_name"));
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new EducationRecord
            {
                ResidentId = residentId,
                RecordDate = recordDate,
                EducationLevel = GetString(row, "education_level", "Unknown"),
                SchoolName = GetNullableString(row, "school_name"),
                EnrollmentStatus = GetString(row, "enrollment_status", "Unknown"),
                AttendanceRate = GetDecimal(row, "attendance_rate") ?? 0m,
                ProgressPercent = GetDecimal(row, "progress_percent") ?? 0m,
                CompletionStatus = GetString(row, "completion_status", "Unknown"),
                Notes = GetNullableString(row, "notes")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["education_records"] = pending.Count;
        matchedCounts["education_records"] = matched;
    }

    private async Task BackfillHealthRecordsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> residentMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var record in await dbContext.HealthWellbeingRecords.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(record.ResidentId, record.RecordDate, record.GeneralHealthScore, record.Bmi));
        }

        var pending = new List<HealthWellbeingRecord>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "health_wellbeing_records.csv")))
        {
            var residentCsvId = GetInt(row, "resident_id");
            if (!residentCsvId.HasValue || !residentMap.TryGetValue(residentCsvId.Value, out var residentId))
            {
                warnings.Add($"Skipped health_wellbeing_records.health_record_id={GetInt(row, "health_record_id")} because resident mapping was missing.");
                continue;
            }

            var recordDate = GetDateOnly(row, "record_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var generalHealthScore = GetDecimal(row, "general_health_score") ?? 0m;
            var bmi = GetDecimal(row, "bmi");
            var key = NormalizeCompositeKey(residentId, recordDate, generalHealthScore, bmi);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new HealthWellbeingRecord
            {
                ResidentId = residentId,
                RecordDate = recordDate,
                GeneralHealthScore = generalHealthScore,
                NutritionScore = GetDecimal(row, "nutrition_score") ?? 0m,
                SleepQualityScore = GetDecimal(row, "sleep_quality_score") ?? 0m,
                EnergyLevelScore = GetDecimal(row, "energy_level_score") ?? 0m,
                HeightCm = GetDecimal(row, "height_cm"),
                WeightKg = GetDecimal(row, "weight_kg"),
                Bmi = bmi,
                MedicalCheckupDone = GetBool(row, "medical_checkup_done"),
                DentalCheckupDone = GetBool(row, "dental_checkup_done"),
                PsychologicalCheckupDone = GetBool(row, "psychological_checkup_done"),
                Notes = GetNullableString(row, "notes")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["health_wellbeing_records"] = pending.Count;
        matchedCounts["health_wellbeing_records"] = matched;
    }

    private async Task BackfillInterventionPlansAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> residentMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var plan in await dbContext.InterventionPlans.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(plan.ResidentId, plan.PlanCategory, plan.TargetDate, plan.Status, plan.PlanDescription));
        }

        var pending = new List<InterventionPlan>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "intervention_plans.csv")))
        {
            var residentCsvId = GetInt(row, "resident_id");
            if (!residentCsvId.HasValue || !residentMap.TryGetValue(residentCsvId.Value, out var residentId))
            {
                warnings.Add($"Skipped intervention_plans.plan_id={GetInt(row, "plan_id")} because resident mapping was missing.");
                continue;
            }

            var targetDate = GetDateOnly(row, "target_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var key = NormalizeCompositeKey(
                residentId,
                GetString(row, "plan_category", "General"),
                targetDate,
                GetString(row, "status", "Open"),
                GetString(row, "plan_description", string.Empty));

            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new InterventionPlan
            {
                ResidentId = residentId,
                PlanCategory = GetString(row, "plan_category", "General"),
                PlanDescription = GetString(row, "plan_description", string.Empty),
                ServicesProvided = GetString(row, "services_provided", string.Empty),
                TargetValue = GetDecimal(row, "target_value"),
                TargetDate = targetDate,
                Status = GetString(row, "status", "Open"),
                CaseConferenceDate = GetDateOnly(row, "case_conference_date"),
                CreatedAtUtc = GetDateTime(row, "created_at") ?? DateTime.UtcNow,
                UpdatedAtUtc = GetDateTime(row, "updated_at") ?? DateTime.UtcNow
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["intervention_plans"] = pending.Count;
        matchedCounts["intervention_plans"] = matched;
    }

    private async Task BackfillIncidentReportsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> residentMap,
        IReadOnlyDictionary<int, int> safehouseMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var residentSafehouseMap = await dbContext.Residents.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.SafehouseId, cancellationToken);
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var incident in await dbContext.IncidentReports.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(incident.ResidentId, incident.IncidentDate, incident.IncidentType, incident.Severity, incident.ReportedBy));
        }

        var pending = new List<IncidentReport>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "incident_reports.csv")))
        {
            var residentCsvId = GetInt(row, "resident_id");
            var safehouseCsvId = GetInt(row, "safehouse_id");
            if (!residentCsvId.HasValue || !residentMap.TryGetValue(residentCsvId.Value, out var residentId))
            {
                warnings.Add($"Skipped incident_reports.incident_id={GetInt(row, "incident_id")} because resident mapping was missing.");
                continue;
            }

            var incidentDate = GetDateOnly(row, "incident_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var incidentType = GetString(row, "incident_type", "General");
            var severity = GetString(row, "severity", "Low");
            var reportedBy = GetString(row, "reported_by", "Unknown");
            var key = NormalizeCompositeKey(residentId, incidentDate, incidentType, severity, reportedBy);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            var safehouseId = residentSafehouseMap[residentId];
            if (safehouseCsvId.HasValue && safehouseMap.TryGetValue(safehouseCsvId.Value, out var requestedSafehouseId) && requestedSafehouseId != safehouseId)
            {
                warnings.Add($"incident_reports.incident_id={GetInt(row, "incident_id")} safehouse mismatch; using resident safehouse {safehouseId}.");
            }

            pending.Add(new IncidentReport
            {
                ResidentId = residentId,
                SafehouseId = safehouseId,
                IncidentDate = incidentDate,
                IncidentType = incidentType,
                Severity = severity,
                Description = GetString(row, "description", string.Empty),
                ResponseTaken = GetString(row, "response_taken", string.Empty),
                Resolved = GetBool(row, "resolved"),
                ResolutionDate = GetDateOnly(row, "resolution_date"),
                ReportedBy = reportedBy,
                FollowUpRequired = GetBool(row, "follow_up_required")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["incident_reports"] = pending.Count;
        matchedCounts["incident_reports"] = matched;
    }

    private async Task BackfillHomeVisitationsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> residentMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var visit in await dbContext.HomeVisitations.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(visit.ResidentId, visit.VisitDate, visit.SocialWorker, visit.VisitType, visit.LocationVisited));
        }

        var pending = new List<HomeVisitation>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "home_visitations.csv")))
        {
            var residentCsvId = GetInt(row, "resident_id");
            if (!residentCsvId.HasValue || !residentMap.TryGetValue(residentCsvId.Value, out var residentId))
            {
                warnings.Add($"Skipped home_visitations.visitation_id={GetInt(row, "visitation_id")} because resident mapping was missing.");
                continue;
            }

            var visitDate = GetDateOnly(row, "visit_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var socialWorker = GetString(row, "social_worker", "Unknown");
            var visitType = GetString(row, "visit_type", "Unknown");
            var locationVisited = GetString(row, "location_visited", "Unknown");
            var key = NormalizeCompositeKey(residentId, visitDate, socialWorker, visitType, locationVisited);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new HomeVisitation
            {
                ResidentId = residentId,
                VisitDate = visitDate,
                SocialWorker = socialWorker,
                VisitType = visitType,
                LocationVisited = locationVisited,
                FamilyMembersPresent = GetString(row, "family_members_present", "Unknown"),
                Purpose = GetString(row, "purpose", string.Empty),
                Observations = GetString(row, "observations", string.Empty),
                FamilyCooperationLevel = GetString(row, "family_cooperation_level", "Unknown"),
                SafetyConcernsNoted = GetBool(row, "safety_concerns_noted"),
                FollowUpNeeded = GetBool(row, "follow_up_needed"),
                FollowUpNotes = GetNullableString(row, "follow_up_notes"),
                VisitOutcome = GetString(row, "visit_outcome", "Unknown")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["home_visitations"] = pending.Count;
        matchedCounts["home_visitations"] = matched;
    }

    private async Task BackfillProcessRecordingsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> residentMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var recording in await dbContext.ProcessRecordings.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(
                recording.ResidentId,
                recording.SessionDate,
                recording.SocialWorker,
                recording.SessionType,
                recording.SessionDurationMinutes,
                recording.SessionNarrative));
        }

        var pending = new List<ProcessRecording>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "process_recordings.csv")))
        {
            var residentCsvId = GetInt(row, "resident_id");
            if (!residentCsvId.HasValue || !residentMap.TryGetValue(residentCsvId.Value, out var residentId))
            {
                warnings.Add($"Skipped process_recordings.recording_id={GetInt(row, "recording_id")} because resident mapping was missing.");
                continue;
            }

            var sessionDate = GetDateOnly(row, "session_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var socialWorker = GetString(row, "social_worker", "Unknown");
            var sessionType = GetString(row, "session_type", "Unknown");
            var sessionDurationMinutes = GetInt(row, "session_duration_minutes") ?? 0;
            var sessionNarrative = GetString(row, "session_narrative", string.Empty);
            var key = NormalizeCompositeKey(residentId, sessionDate, socialWorker, sessionType, sessionDurationMinutes, sessionNarrative);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new ProcessRecording
            {
                ResidentId = residentId,
                SessionDate = sessionDate,
                SocialWorker = socialWorker,
                SessionType = sessionType,
                SessionDurationMinutes = sessionDurationMinutes,
                EmotionalStateObserved = GetString(row, "emotional_state_observed", "Unknown"),
                EmotionalStateEnd = GetString(row, "emotional_state_end", "Unknown"),
                SessionNarrative = sessionNarrative,
                InterventionsApplied = GetString(row, "interventions_applied", string.Empty),
                FollowUpActions = GetString(row, "follow_up_actions", string.Empty),
                ProgressNoted = GetBool(row, "progress_noted"),
                ConcernsFlagged = GetBool(row, "concerns_flagged"),
                ReferralMade = GetBool(row, "referral_made"),
                RestrictedNotes = GetNullableString(row, "notes_restricted")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["process_recordings"] = pending.Count;
        matchedCounts["process_recordings"] = matched;
    }

    private async Task BackfillSafehouseMonthlyMetricsAsync(
        string csvRoot,
        IReadOnlyDictionary<int, int> safehouseMap,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        ICollection<string> warnings,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var metric in await dbContext.SafehouseMonthlyMetrics.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(metric.SafehouseId, metric.MonthStart));
        }

        var pending = new List<SafehouseMonthlyMetric>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "safehouse_monthly_metrics.csv")))
        {
            var safehouseCsvId = GetInt(row, "safehouse_id");
            if (!safehouseCsvId.HasValue || !safehouseMap.TryGetValue(safehouseCsvId.Value, out var safehouseId))
            {
                warnings.Add($"Skipped safehouse_monthly_metrics.metric_id={GetInt(row, "metric_id")} because safehouse mapping was missing.");
                continue;
            }

            var monthStart = GetDateOnly(row, "month_start") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var key = NormalizeCompositeKey(safehouseId, monthStart);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new SafehouseMonthlyMetric
            {
                SafehouseId = safehouseId,
                MonthStart = monthStart,
                MonthEnd = GetDateOnly(row, "month_end") ?? monthStart,
                ActiveResidents = GetInt(row, "active_residents") ?? 0,
                AvgEducationProgress = GetDecimal(row, "avg_education_progress") ?? 0m,
                AvgHealthScore = GetDecimal(row, "avg_health_score") ?? 0m,
                ProcessRecordingCount = GetInt(row, "process_recording_count") ?? 0,
                HomeVisitationCount = GetInt(row, "home_visitation_count") ?? 0,
                IncidentCount = GetInt(row, "incident_count") ?? 0,
                Notes = GetNullableString(row, "notes")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["safehouse_monthly_metrics"] = pending.Count;
        matchedCounts["safehouse_monthly_metrics"] = matched;
    }

    private async Task BackfillPublicImpactSnapshotsAsync(
        string csvRoot,
        IDictionary<string, int> insertedCounts,
        IDictionary<string, int> matchedCounts,
        CancellationToken cancellationToken)
    {
        var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var snapshot in await dbContext.PublicImpactSnapshots.AsNoTracking().ToListAsync(cancellationToken))
        {
            existingKeys.Add(NormalizeCompositeKey(snapshot.SnapshotDate, snapshot.Headline));
        }

        var pending = new List<PublicImpactSnapshot>();
        var matched = 0;
        foreach (var row in ReadRows(Path.Combine(csvRoot, "public_impact_snapshots.csv")))
        {
            var snapshotDate = GetDateOnly(row, "snapshot_date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var headline = GetString(row, "headline", "Impact snapshot");
            var key = NormalizeCompositeKey(snapshotDate, headline);
            if (existingKeys.Contains(key))
            {
                matched++;
                continue;
            }

            pending.Add(new PublicImpactSnapshot
            {
                SnapshotDate = snapshotDate,
                Headline = headline,
                SummaryText = GetString(row, "summary_text", string.Empty),
                MetricPayloadJson = NormalizeMetricPayloadJson(GetNullableString(row, "metric_payload_json")),
                IsPublished = GetBool(row, "is_published"),
                PublishedAt = GetDateOnly(row, "published_at")
            });
            existingKeys.Add(key);
        }

        await SavePendingAsync(pending, cancellationToken);
        insertedCounts["public_impact_snapshots"] = pending.Count;
        matchedCounts["public_impact_snapshots"] = matched;
    }

    private static string BuildDonationKey(
        int supporterId,
        string donationType,
        DateOnly donationDate,
        string channelSource,
        string? currencyCode,
        decimal? amount,
        decimal estimatedValue,
        bool isRecurring,
        string? campaignName)
        => NormalizeCompositeKey(supporterId, donationType, donationDate, channelSource, currencyCode, amount, estimatedValue, isRecurring, campaignName);

    private static string? BuildSocialPostKey(string? platformPostId, string? postUrl)
    {
        if (!string.IsNullOrWhiteSpace(platformPostId))
        {
            return $"POST:{NormalizeKey(platformPostId)}";
        }

        if (!string.IsNullOrWhiteSpace(postUrl))
        {
            return $"URL:{NormalizeKey(postUrl)}";
        }

        return null;
    }

    private async Task SavePendingAsync<T>(List<T> pending, CancellationToken cancellationToken) where T : class
    {
        if (pending.Count == 0)
        {
            return;
        }

        dbContext.Set<T>().AddRange(pending);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
