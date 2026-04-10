using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using CsvHelper;
using CsvHelper.Configuration;
using Intex.Api.Entities;
using Intex.Api.Models.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Options;

namespace Intex.Api.Data.Seed;

public sealed class CsvRelationalSeeder(
    ApplicationDbContext dbContext,
    IOptions<SeedOptions> seedOptions,
    IHostEnvironment hostEnvironment,
    ILogger<CsvRelationalSeeder> logger) : ICsvRelationalSeeder
{
    private readonly SeedOptions options = seedOptions.Value;

    public async Task<CsvSeedResult> SeedAsync(CancellationToken cancellationToken = default)
    {
        var importedCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var errors = new List<string>();

        if (await dbContext.Safehouses.AnyAsync(cancellationToken))
        {
            logger.LogInformation(
                "CSV relational seed skipped: Safehouses already populated (idempotent). Resolved CSV root would be {CsvRoot}.",
                ResolveCsvRoot());
            return new CsvSeedResult(true, importedCounts, errors);
        }

        var csvRoot = ResolveCsvRoot();
        logger.LogInformation("CSV relational seed starting from directory {CsvRoot}.", csvRoot);
        var requiredFiles = new[]
        {
            "safehouses.csv", "partners.csv", "supporters.csv", "social_media_posts.csv",
            "residents.csv", "partner_assignments.csv", "donations.csv", "donation_allocations.csv",
            "in_kind_donation_items.csv", "education_records.csv", "health_wellbeing_records.csv",
            "intervention_plans.csv", "incident_reports.csv", "home_visitations.csv",
            "process_recordings.csv", "safehouse_monthly_metrics.csv", "public_impact_snapshots.csv"
        };

        foreach (var file in requiredFiles)
        {
            var path = Path.Combine(csvRoot, file);
            if (!File.Exists(path))
            {
                errors.Add($"Missing CSV file: {path}");
            }
        }

        if (errors.Count > 0)
        {
            return new CsvSeedResult(false, importedCounts, errors);
        }

        if (dbContext.Database.IsRelational())
        {
            var strategy = dbContext.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    await RunImportPipelineAsync(csvRoot, importedCounts, errors, cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    errors.Add($"CSV relational seed failed: {ex.Message}");
                    logger.LogError(ex, "CSV relational seed failed.");
                }
            });
        }
        else
        {
            try
            {
                await RunImportPipelineAsync(csvRoot, importedCounts, errors, cancellationToken);
            }
            catch (Exception ex)
            {
                errors.Add($"CSV relational seed failed: {ex.Message}");
                logger.LogError(ex, "CSV relational seed failed.");
            }
        }

        return new CsvSeedResult(errors.Count == 0, importedCounts, errors);
    }

    private string ResolveCsvRoot()
    {
        if (!string.IsNullOrWhiteSpace(options.CsvPath))
        {
            return Path.IsPathRooted(options.CsvPath)
                ? options.CsvPath
                : Path.GetFullPath(Path.Combine(hostEnvironment.ContentRootPath, options.CsvPath));
        }

        return Path.GetFullPath(Path.Combine(hostEnvironment.ContentRootPath, "..", "..", "ml-pipelines", "lighthouse_csv_v7"));
    }

    private static List<Dictionary<string, string?>> ReadRows(string csvPath)
    {
        var rows = new List<Dictionary<string, string?>>();
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            BadDataFound = null,
            MissingFieldFound = null,
            HeaderValidated = null
        };

        using var reader = new StreamReader(csvPath);
        using var csv = new CsvReader(reader, config);
        csv.Read();
        csv.ReadHeader();
        var headers = csv.HeaderRecord ?? Array.Empty<string>();

        while (csv.Read())
        {
            var row = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var header in headers)
            {
                row[header] = csv.GetField(header);
            }

            rows.Add(row);
        }

        return rows;
    }

    private static string GetString(IReadOnlyDictionary<string, string?> row, string key, string fallback = "")
        => GetNullableString(row, key) ?? fallback;

    private static string? GetNullableString(IReadOnlyDictionary<string, string?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static int? GetInt(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null) return null;
        if (int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var intValue)) return intValue;
        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue)) return (int)decimalValue;
        return null;
    }

    private static decimal? GetDecimal(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null) return null;
        return decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : null;
    }

    private static bool GetBool(IReadOnlyDictionary<string, string?> row, string key, bool fallback = false)
    {
        var text = GetNullableString(row, key);
        if (text is null) return fallback;
        if (bool.TryParse(text, out var boolValue)) return boolValue;
        if (int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var intValue)) return intValue != 0;
        var normalized = text.Trim().ToLowerInvariant();
        return normalized is "yes" or "y" or "t";
    }

    private static DateOnly? GetDateOnly(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null) return null;
        if (DateOnly.TryParse(text, CultureInfo.InvariantCulture, out var date)) return date;
        if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var dateTime))
        {
            return DateOnly.FromDateTime(dateTime);
        }

        return null;
    }

    private static DateTime? GetDateTime(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null) return null;
        if (!DateTime.TryParse(
                text,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var dateTime))
        {
            return null;
        }

        return dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime,
            DateTimeKind.Unspecified => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc),
            _ => dateTime.ToUniversalTime()
        };
    }

    private static string NormalizeMetricPayloadJson(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "{}";
        }

        var candidate = raw.Trim();
        if (TryParseJson(candidate))
        {
            return candidate;
        }

        candidate = candidate.Replace("'", "\"", StringComparison.Ordinal)
            .Replace("None", "null", StringComparison.Ordinal)
            .Replace("True", "true", StringComparison.Ordinal)
            .Replace("False", "false", StringComparison.Ordinal);
        candidate = Regex.Replace(candidate, @"(?<=\{|,)\s*([A-Za-z0-9_]+)\s*:", "\"$1\":");

        return TryParseJson(candidate) ? candidate : "{}";
    }

    private static bool TryParseJson(string candidate)
    {
        try
        {
            using var _ = JsonDocument.Parse(candidate);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<int> ImportSafehousesAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var rows = ReadRows(Path.Combine(csvRoot, "safehouses.csv"));
        var entities = rows.Select(row => new Safehouse
        {
            Id = GetInt(row, "safehouse_id") ?? 0,
            Code = GetString(row, "safehouse_code", "SH-UNK"),
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
        }).ToList();

        dbContext.Safehouses.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportPartnersAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var rows = ReadRows(Path.Combine(csvRoot, "partners.csv"));
        var entities = rows.Select(row => new Partner
        {
            Id = GetInt(row, "partner_id") ?? 0,
            PartnerName = GetString(row, "partner_name", "Unknown Partner"),
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
        }).ToList();

        dbContext.Partners.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportSupportersAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var rows = ReadRows(Path.Combine(csvRoot, "supporters.csv"));
        var entities = rows.Select(row => new Supporter
        {
            Id = GetInt(row, "supporter_id") ?? 0,
            SupporterType = GetString(row, "supporter_type", "Unknown"),
            DisplayName = GetString(row, "display_name", "Unknown"),
            OrganizationName = GetNullableString(row, "organization_name"),
            FirstName = GetNullableString(row, "first_name"),
            LastName = GetNullableString(row, "last_name"),
            RelationshipType = GetString(row, "relationship_type", "Unknown"),
            Region = GetString(row, "region", "Unknown"),
            Country = GetString(row, "country", "Unknown"),
            Email = GetString(row, "email", $"supporter-{Guid.NewGuid():N}@intex.local"),
            Phone = GetNullableString(row, "phone"),
            Status = GetString(row, "status", "Active"),
            FirstDonationDate = GetDateOnly(row, "first_donation_date"),
            AcquisitionChannel = GetString(row, "acquisition_channel", "Unknown"),
            CreatedAtUtc = GetDateTime(row, "created_at") ?? DateTime.UtcNow
        }).ToList();

        dbContext.Supporters.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportSocialMediaPostsAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var rows = ReadRows(Path.Combine(csvRoot, "social_media_posts.csv"));
        var entities = rows.Select(row => new SocialMediaPost
        {
            Id = GetInt(row, "post_id") ?? 0,
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
        }).ToList();

        dbContext.SocialMediaPosts.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportResidentsAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var validSafehouseIds = await dbContext.Safehouses.AsNoTracking().Select(x => x.Id).ToHashSetAsync(cancellationToken);
        var rows = ReadRows(Path.Combine(csvRoot, "residents.csv"));

        var entities = rows
            .Where(row => validSafehouseIds.Contains(GetInt(row, "safehouse_id") ?? -1))
            .Select(row => new Resident
            {
                Id = GetInt(row, "resident_id") ?? 0,
                CaseControlNumber = GetString(row, "case_control_no", string.Empty),
                InternalCode = GetString(row, "internal_code", string.Empty),
                SafehouseId = GetInt(row, "safehouse_id") ?? 0,
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
            }).ToList();

        dbContext.Residents.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportPublicImpactSnapshotsAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var rows = ReadRows(Path.Combine(csvRoot, "public_impact_snapshots.csv"));
        var entities = rows.Select(row => new PublicImpactSnapshot
        {
            Id = GetInt(row, "snapshot_id") ?? 0,
            SnapshotDate = GetDateOnly(row, "snapshot_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
            Headline = GetString(row, "headline", "Impact snapshot"),
            SummaryText = GetString(row, "summary_text", string.Empty),
            MetricPayloadJson = NormalizeMetricPayloadJson(GetNullableString(row, "metric_payload_json")),
            IsPublished = GetBool(row, "is_published"),
            PublishedAt = GetDateOnly(row, "published_at")
        }).ToList();

        dbContext.PublicImpactSnapshots.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportPartnerAssignmentsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "partner_assignments.csv"),
            "partner_assignments",
            errors,
            row =>
            {
                var partnerId = GetInt(row, "partner_id");
                var safehouseId = GetInt(row, "safehouse_id");
                if (!partnerId.HasValue || !safehouseId.HasValue) return null;
                if (!dbContext.Partners.Any(x => x.Id == partnerId.Value))
                {
                    errors.Add($"Skipped partner_assignments.assignment_id={GetInt(row, "assignment_id")} (missing partner_id={partnerId.Value})");
                    return null;
                }

                if (!dbContext.Safehouses.Any(x => x.Id == safehouseId.Value))
                {
                    errors.Add($"Skipped partner_assignments.assignment_id={GetInt(row, "assignment_id")} (missing safehouse_id={safehouseId.Value})");
                    return null;
                }

                return new PartnerAssignment
                {
                    Id = GetInt(row, "assignment_id") ?? 0,
                    PartnerId = partnerId.Value,
                    SafehouseId = safehouseId.Value,
                    ProgramArea = GetString(row, "program_area", "General"),
                    AssignmentStart = GetDateOnly(row, "assignment_start"),
                    AssignmentEnd = GetDateOnly(row, "assignment_end"),
                    ResponsibilityNotes = GetNullableString(row, "responsibility_notes"),
                    IsPrimary = GetBool(row, "is_primary"),
                    Status = GetString(row, "status", "Active")
                };
            },
            cancellationToken);

    private async Task<int> ImportDonationsAsync(string csvRoot, CancellationToken cancellationToken)
    {
        var validSupporterIds = await dbContext.Supporters.AsNoTracking().Select(x => x.Id).ToHashSetAsync(cancellationToken);
        var rows = ReadRows(Path.Combine(csvRoot, "donations.csv"));
        var entities = rows
            .Where(row => validSupporterIds.Contains(GetInt(row, "supporter_id") ?? -1))
            .Select(row => new Donation
            {
                Id = GetInt(row, "donation_id") ?? 0,
                SupporterId = GetInt(row, "supporter_id") ?? 0,
                DonationType = GetString(row, "donation_type", "Unknown"),
                DonationDate = GetDateOnly(row, "donation_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                ChannelSource = GetString(row, "channel_source", "Unknown"),
                CurrencyCode = GetNullableString(row, "currency_code"),
                Amount = GetDecimal(row, "amount"),
                EstimatedValue = GetDecimal(row, "estimated_value") ?? GetDecimal(row, "amount") ?? 0m,
                ImpactUnit = GetString(row, "impact_unit", "unit"),
                IsRecurring = GetBool(row, "is_recurring"),
                CampaignName = GetNullableString(row, "campaign_name"),
                Notes = GetNullableString(row, "notes")
            }).ToList();

        dbContext.Donations.AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task<int> ImportDonationAllocationsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "donation_allocations.csv"),
            "donation_allocations",
            errors,
            row =>
            {
                var donationId = GetInt(row, "donation_id");
                var safehouseId = GetInt(row, "safehouse_id");
                if (!donationId.HasValue || !safehouseId.HasValue) return null;
                if (!dbContext.Donations.Any(x => x.Id == donationId.Value) || !dbContext.Safehouses.Any(x => x.Id == safehouseId.Value))
                {
                    errors.Add($"Skipped donation_allocations.allocation_id={GetInt(row, "allocation_id")} (orphan FK)");
                    return null;
                }

                return new DonationAllocation
                {
                    Id = GetInt(row, "allocation_id") ?? 0,
                    DonationId = donationId.Value,
                    SafehouseId = safehouseId.Value,
                    ProgramArea = GetString(row, "program_area", "General"),
                    AmountAllocated = GetDecimal(row, "amount_allocated") ?? 0m,
                    AllocationDate = GetDateOnly(row, "allocation_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    AllocationNotes = GetNullableString(row, "allocation_notes")
                };
            },
            cancellationToken);

    private async Task<int> ImportInKindDonationItemsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "in_kind_donation_items.csv"),
            "in_kind_donation_items",
            errors,
            row =>
            {
                var donationId = GetInt(row, "donation_id");
                if (!donationId.HasValue || !dbContext.Donations.Any(x => x.Id == donationId.Value))
                {
                    errors.Add($"Skipped in_kind_donation_items.item_id={GetInt(row, "item_id")} (missing donation_id)");
                    return null;
                }

                return new InKindDonationItem
                {
                    Id = GetInt(row, "item_id") ?? 0,
                    DonationId = donationId.Value,
                    ItemName = GetString(row, "item_name", "Unknown item"),
                    ItemCategory = GetString(row, "item_category", "Other"),
                    Quantity = GetDecimal(row, "quantity") ?? 0m,
                    UnitOfMeasure = GetString(row, "unit_of_measure", "units"),
                    EstimatedUnitValue = GetDecimal(row, "estimated_unit_value"),
                    IntendedUse = GetNullableString(row, "intended_use"),
                    ReceivedCondition = GetNullableString(row, "received_condition")
                };
            },
            cancellationToken);

    private async Task<int> ImportEducationRecordsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "education_records.csv"),
            "education_records",
            errors,
            row =>
            {
                var residentId = GetInt(row, "resident_id");
                if (!residentId.HasValue || !dbContext.Residents.Any(x => x.Id == residentId.Value))
                {
                    errors.Add($"Skipped education_records.education_record_id={GetInt(row, "education_record_id")} (missing resident_id)");
                    return null;
                }

                return new EducationRecord
                {
                    Id = GetInt(row, "education_record_id") ?? 0,
                    ResidentId = residentId.Value,
                    RecordDate = GetDateOnly(row, "record_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    EducationLevel = GetString(row, "education_level", "Unknown"),
                    SchoolName = GetNullableString(row, "school_name"),
                    EnrollmentStatus = GetString(row, "enrollment_status", "Unknown"),
                    AttendanceRate = GetDecimal(row, "attendance_rate") ?? 0m,
                    ProgressPercent = GetDecimal(row, "progress_percent") ?? 0m,
                    CompletionStatus = GetString(row, "completion_status", "Unknown"),
                    Notes = GetNullableString(row, "notes")
                };
            },
            cancellationToken);

    private async Task<int> ImportHealthWellbeingRecordsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "health_wellbeing_records.csv"),
            "health_wellbeing_records",
            errors,
            row =>
            {
                var residentId = GetInt(row, "resident_id");
                if (!residentId.HasValue || !dbContext.Residents.Any(x => x.Id == residentId.Value))
                {
                    errors.Add($"Skipped health_wellbeing_records.health_record_id={GetInt(row, "health_record_id")} (missing resident_id)");
                    return null;
                }

                return new HealthWellbeingRecord
                {
                    Id = GetInt(row, "health_record_id") ?? 0,
                    ResidentId = residentId.Value,
                    RecordDate = GetDateOnly(row, "record_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    GeneralHealthScore = GetDecimal(row, "general_health_score") ?? 0m,
                    NutritionScore = GetDecimal(row, "nutrition_score") ?? 0m,
                    SleepQualityScore = GetDecimal(row, "sleep_quality_score") ?? 0m,
                    EnergyLevelScore = GetDecimal(row, "energy_level_score") ?? 0m,
                    HeightCm = GetDecimal(row, "height_cm"),
                    WeightKg = GetDecimal(row, "weight_kg"),
                    Bmi = GetDecimal(row, "bmi"),
                    MedicalCheckupDone = GetBool(row, "medical_checkup_done"),
                    DentalCheckupDone = GetBool(row, "dental_checkup_done"),
                    PsychologicalCheckupDone = GetBool(row, "psychological_checkup_done"),
                    Notes = GetNullableString(row, "notes")
                };
            },
            cancellationToken);

    private async Task<int> ImportInterventionPlansAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "intervention_plans.csv"),
            "intervention_plans",
            errors,
            row =>
            {
                var residentId = GetInt(row, "resident_id");
                if (!residentId.HasValue || !dbContext.Residents.Any(x => x.Id == residentId.Value))
                {
                    errors.Add($"Skipped intervention_plans.plan_id={GetInt(row, "plan_id")} (missing resident_id)");
                    return null;
                }

                return new InterventionPlan
                {
                    Id = GetInt(row, "plan_id") ?? 0,
                    ResidentId = residentId.Value,
                    PlanCategory = GetString(row, "plan_category", "General"),
                    PlanDescription = GetString(row, "plan_description", string.Empty),
                    ServicesProvided = GetString(row, "services_provided", string.Empty),
                    TargetValue = GetDecimal(row, "target_value"),
                    TargetDate = GetDateOnly(row, "target_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    Status = GetString(row, "status", "Open"),
                    CaseConferenceDate = GetDateOnly(row, "case_conference_date"),
                    CreatedAtUtc = GetDateTime(row, "created_at") ?? DateTime.UtcNow,
                    UpdatedAtUtc = GetDateTime(row, "updated_at") ?? DateTime.UtcNow
                };
            },
            cancellationToken);

    private async Task<int> ImportIncidentReportsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "incident_reports.csv"),
            "incident_reports",
            errors,
            row =>
            {
                var residentId = GetInt(row, "resident_id");
                var safehouseId = GetInt(row, "safehouse_id");
                if (!residentId.HasValue || !safehouseId.HasValue)
                {
                    errors.Add($"Skipped incident_reports.incident_id={GetInt(row, "incident_id")} (missing resident/safehouse)");
                    return null;
                }

                var resident = dbContext.Residents.AsNoTracking().FirstOrDefault(x => x.Id == residentId.Value);
                if (resident is null || !dbContext.Safehouses.Any(x => x.Id == safehouseId.Value))
                {
                    errors.Add($"Skipped incident_reports.incident_id={GetInt(row, "incident_id")} (orphan FK)");
                    return null;
                }

                var enforcedSafehouseId = safehouseId.Value;
                if (resident.SafehouseId != safehouseId.Value)
                {
                    errors.Add($"incident_reports.incident_id={GetInt(row, "incident_id")} safehouse_id mismatch; using resident safehouse {resident.SafehouseId}");
                    enforcedSafehouseId = resident.SafehouseId;
                }

                return new IncidentReport
                {
                    Id = GetInt(row, "incident_id") ?? 0,
                    ResidentId = residentId.Value,
                    SafehouseId = enforcedSafehouseId,
                    IncidentDate = GetDateOnly(row, "incident_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    IncidentType = GetString(row, "incident_type", "General"),
                    Severity = GetString(row, "severity", "Low"),
                    Description = GetString(row, "description", string.Empty),
                    ResponseTaken = GetString(row, "response_taken", string.Empty),
                    Resolved = GetBool(row, "resolved"),
                    ResolutionDate = GetDateOnly(row, "resolution_date"),
                    ReportedBy = GetString(row, "reported_by", "Unknown"),
                    FollowUpRequired = GetBool(row, "follow_up_required")
                };
            },
            cancellationToken);

    private async Task<int> ImportHomeVisitationsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "home_visitations.csv"),
            "home_visitations",
            errors,
            row =>
            {
                var residentId = GetInt(row, "resident_id");
                if (!residentId.HasValue || !dbContext.Residents.Any(x => x.Id == residentId.Value))
                {
                    errors.Add($"Skipped home_visitations.visitation_id={GetInt(row, "visitation_id")} (missing resident_id)");
                    return null;
                }

                return new HomeVisitation
                {
                    Id = GetInt(row, "visitation_id") ?? 0,
                    ResidentId = residentId.Value,
                    VisitDate = GetDateOnly(row, "visit_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    SocialWorker = GetString(row, "social_worker", "Unknown"),
                    VisitType = GetString(row, "visit_type", "Unknown"),
                    LocationVisited = GetString(row, "location_visited", "Unknown"),
                    FamilyMembersPresent = GetString(row, "family_members_present", "Unknown"),
                    Purpose = GetString(row, "purpose", string.Empty),
                    Observations = GetString(row, "observations", string.Empty),
                    FamilyCooperationLevel = GetString(row, "family_cooperation_level", "Unknown"),
                    SafetyConcernsNoted = GetBool(row, "safety_concerns_noted"),
                    FollowUpNeeded = GetBool(row, "follow_up_needed"),
                    FollowUpNotes = GetNullableString(row, "follow_up_notes"),
                    VisitOutcome = GetString(row, "visit_outcome", "Unknown")
                };
            },
            cancellationToken);

    private async Task<int> ImportProcessRecordingsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "process_recordings.csv"),
            "process_recordings",
            errors,
            row =>
            {
                var residentId = GetInt(row, "resident_id");
                if (!residentId.HasValue || !dbContext.Residents.Any(x => x.Id == residentId.Value))
                {
                    errors.Add($"Skipped process_recordings.recording_id={GetInt(row, "recording_id")} (missing resident_id)");
                    return null;
                }

                return new ProcessRecording
                {
                    Id = GetInt(row, "recording_id") ?? 0,
                    ResidentId = residentId.Value,
                    SessionDate = GetDateOnly(row, "session_date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    SocialWorker = GetString(row, "social_worker", "Unknown"),
                    SessionType = GetString(row, "session_type", "Unknown"),
                    SessionDurationMinutes = GetInt(row, "session_duration_minutes") ?? 0,
                    EmotionalStateObserved = GetString(row, "emotional_state_observed", "Unknown"),
                    EmotionalStateEnd = GetString(row, "emotional_state_end", "Unknown"),
                    SessionNarrative = GetString(row, "session_narrative", string.Empty),
                    InterventionsApplied = GetString(row, "interventions_applied", string.Empty),
                    FollowUpActions = GetString(row, "follow_up_actions", string.Empty),
                    ProgressNoted = GetBool(row, "progress_noted"),
                    ConcernsFlagged = GetBool(row, "concerns_flagged"),
                    ReferralMade = GetBool(row, "referral_made"),
                    RestrictedNotes = GetNullableString(row, "notes_restricted")
                };
            },
            cancellationToken);

    private async Task<int> ImportSafehouseMonthlyMetricsAsync(string csvRoot, ICollection<string> errors, CancellationToken cancellationToken)
        => await ImportChildRowsAsync(
            Path.Combine(csvRoot, "safehouse_monthly_metrics.csv"),
            "safehouse_monthly_metrics",
            errors,
            row =>
            {
                var safehouseId = GetInt(row, "safehouse_id");
                if (!safehouseId.HasValue || !dbContext.Safehouses.Any(x => x.Id == safehouseId.Value))
                {
                    errors.Add($"Skipped safehouse_monthly_metrics.metric_id={GetInt(row, "metric_id")} (missing safehouse_id)");
                    return null;
                }

                return new SafehouseMonthlyMetric
                {
                    Id = GetInt(row, "metric_id") ?? 0,
                    SafehouseId = safehouseId.Value,
                    MonthStart = GetDateOnly(row, "month_start") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    MonthEnd = GetDateOnly(row, "month_end") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    ActiveResidents = GetInt(row, "active_residents") ?? 0,
                    AvgEducationProgress = GetDecimal(row, "avg_education_progress") ?? 0m,
                    AvgHealthScore = GetDecimal(row, "avg_health_score") ?? 0m,
                    ProcessRecordingCount = GetInt(row, "process_recording_count") ?? 0,
                    HomeVisitationCount = GetInt(row, "home_visitation_count") ?? 0,
                    IncidentCount = GetInt(row, "incident_count") ?? 0,
                    Notes = GetNullableString(row, "notes")
                };
            },
            cancellationToken);

    private async Task<int> ImportChildRowsAsync<T>(
        string csvPath,
        string label,
        ICollection<string> errors,
        Func<Dictionary<string, string?>, T?> mapper,
        CancellationToken cancellationToken) where T : class
    {
        var rows = ReadRows(csvPath);
        var entities = new List<T>();
        foreach (var row in rows)
        {
            var mapped = mapper(row);
            if (mapped is not null)
            {
                entities.Add(mapped);
            }
        }

        if (entities.Count == 0)
        {
            logger.LogWarning("CSV import for {Label} produced no rows.", label);
            return 0;
        }

        dbContext.Set<T>().AddRange(entities);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    private async Task RunImportPipelineAsync(
        string csvRoot,
        IDictionary<string, int> importedCounts,
        ICollection<string> errors,
        CancellationToken cancellationToken)
    {
        importedCounts["safehouses"] = await ImportSafehousesAsync(csvRoot, cancellationToken);
        importedCounts["partners"] = await ImportPartnersAsync(csvRoot, cancellationToken);
        importedCounts["supporters"] = await ImportSupportersAsync(csvRoot, cancellationToken);
        importedCounts["social_media_posts"] = await ImportSocialMediaPostsAsync(csvRoot, cancellationToken);
        importedCounts["residents"] = await ImportResidentsAsync(csvRoot, cancellationToken);
        importedCounts["partner_assignments"] = await ImportPartnerAssignmentsAsync(csvRoot, errors, cancellationToken);
        importedCounts["donations"] = await ImportDonationsAsync(csvRoot, cancellationToken);
        importedCounts["donation_allocations"] = await ImportDonationAllocationsAsync(csvRoot, errors, cancellationToken);
        importedCounts["in_kind_donation_items"] = await ImportInKindDonationItemsAsync(csvRoot, errors, cancellationToken);
        importedCounts["education_records"] = await ImportEducationRecordsAsync(csvRoot, errors, cancellationToken);
        importedCounts["health_wellbeing_records"] = await ImportHealthWellbeingRecordsAsync(csvRoot, errors, cancellationToken);
        importedCounts["intervention_plans"] = await ImportInterventionPlansAsync(csvRoot, errors, cancellationToken);
        importedCounts["incident_reports"] = await ImportIncidentReportsAsync(csvRoot, errors, cancellationToken);
        importedCounts["home_visitations"] = await ImportHomeVisitationsAsync(csvRoot, errors, cancellationToken);
        importedCounts["process_recordings"] = await ImportProcessRecordingsAsync(csvRoot, errors, cancellationToken);
        importedCounts["safehouse_monthly_metrics"] = await ImportSafehouseMonthlyMetricsAsync(csvRoot, errors, cancellationToken);
        importedCounts["public_impact_snapshots"] = await ImportPublicImpactSnapshotsAsync(csvRoot, cancellationToken);
        await ResetImportedIdentitySequencesAsync(cancellationToken);
        await ValidateRelationalIntegrityAsync(errors, cancellationToken);
    }

    private async Task ResetImportedIdentitySequencesAsync(CancellationToken cancellationToken)
    {
        if (!dbContext.Database.IsNpgsql())
        {
            logger.LogInformation("Skipping PostgreSQL identity sequence reconciliation for non-Npgsql database provider.");
            return;
        }

        var entities = new[]
        {
            typeof(Safehouse),
            typeof(Partner),
            typeof(Supporter),
            typeof(SocialMediaPost),
            typeof(Resident),
            typeof(PartnerAssignment),
            typeof(Donation),
            typeof(DonationAllocation),
            typeof(InKindDonationItem),
            typeof(EducationRecord),
            typeof(HealthWellbeingRecord),
            typeof(InterventionPlan),
            typeof(IncidentReport),
            typeof(HomeVisitation),
            typeof(ProcessRecording),
            typeof(SafehouseMonthlyMetric),
            typeof(PublicImpactSnapshot)
        };

        foreach (var entityClrType in entities)
        {
            await ResetIdentitySequenceAsync(entityClrType, cancellationToken);
        }
    }

    private async Task ResetIdentitySequenceAsync(Type entityClrType, CancellationToken cancellationToken)
    {
        var entityType = dbContext.Model.FindEntityType(entityClrType);
        if (entityType is null)
        {
            return;
        }

        var tableName = entityType.GetTableName();
        if (string.IsNullOrWhiteSpace(tableName))
        {
            return;
        }

        var schema = entityType.GetSchema() ?? "public";
        var primaryKey = entityType.FindPrimaryKey();
        if (primaryKey?.Properties.Count != 1)
        {
            return;
        }

        var keyProperty = primaryKey.Properties[0];
        if (keyProperty.ClrType != typeof(int))
        {
            return;
        }

        var storeObject = StoreObjectIdentifier.Table(tableName, schema);
        var columnName = keyProperty.GetColumnName(storeObject);
        if (string.IsNullOrWhiteSpace(columnName))
        {
            return;
        }

        var qualifiedTableName = $"{QuoteIdentifier(schema)}.{QuoteIdentifier(tableName)}";
        var sql = $"""
            SELECT setval(sequence_name, next_value, false)
            FROM (
                SELECT pg_get_serial_sequence('{EscapeSqlLiteral(qualifiedTableName)}', '{EscapeSqlLiteral(columnName)}') AS sequence_name,
                       COALESCE((SELECT MAX({QuoteIdentifier(columnName)}) FROM {qualifiedTableName}), 0) + 1 AS next_value
            ) AS seq
            WHERE sequence_name IS NOT NULL;
            """;

        await dbContext.Database.ExecuteSqlRawAsync(sql, cancellationToken);

        logger.LogInformation(
            "CSV relational seed synchronized identity sequence for {Schema}.{Table}.{Column}.",
            schema,
            tableName,
            columnName);
    }

    private static string QuoteIdentifier(string identifier)
        => $"\"{identifier.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";

    private static string EscapeSqlLiteral(string value)
        => value.Replace("'", "''", StringComparison.Ordinal);

    private async Task ValidateRelationalIntegrityAsync(ICollection<string> errors, CancellationToken cancellationToken)
    {
        var orphanDonationAllocations = await dbContext.DonationAllocations
            .Where(x => !dbContext.Donations.Any(d => d.Id == x.DonationId) || !dbContext.Safehouses.Any(s => s.Id == x.SafehouseId))
            .CountAsync(cancellationToken);
        if (orphanDonationAllocations > 0)
        {
            errors.Add($"Detected {orphanDonationAllocations} orphan donation allocation rows.");
        }

        var orphanDonations = await dbContext.Donations
            .Where(x => !dbContext.Supporters.Any(s => s.Id == x.SupporterId))
            .CountAsync(cancellationToken);
        if (orphanDonations > 0)
        {
            errors.Add($"Detected {orphanDonations} orphan donation rows.");
        }

        var orphanResidents = await dbContext.Residents
            .Where(x => !dbContext.Safehouses.Any(s => s.Id == x.SafehouseId))
            .CountAsync(cancellationToken);
        if (orphanResidents > 0)
        {
            errors.Add($"Detected {orphanResidents} orphan resident rows.");
        }

        var orphanHealthRows = await dbContext.HealthWellbeingRecords
            .Where(x => !dbContext.Residents.Any(r => r.Id == x.ResidentId))
            .CountAsync(cancellationToken);
        if (orphanHealthRows > 0)
        {
            errors.Add($"Detected {orphanHealthRows} orphan health_wellbeing_records rows.");
        }

        var orphanEducationRows = await dbContext.EducationRecords
            .Where(x => !dbContext.Residents.Any(r => r.Id == x.ResidentId))
            .CountAsync(cancellationToken);
        if (orphanEducationRows > 0)
        {
            errors.Add($"Detected {orphanEducationRows} orphan education_records rows.");
        }
    }
}
