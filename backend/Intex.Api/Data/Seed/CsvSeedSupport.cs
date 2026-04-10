using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using CsvHelper;
using CsvHelper.Configuration;
using Intex.Api.Models.Options;

namespace Intex.Api.Data.Seed;

internal static class CsvSeedSupport
{
    internal static readonly string[] RequiredFiles =
    [
        "safehouses.csv",
        "partners.csv",
        "supporters.csv",
        "social_media_posts.csv",
        "residents.csv",
        "partner_assignments.csv",
        "donations.csv",
        "donation_allocations.csv",
        "in_kind_donation_items.csv",
        "education_records.csv",
        "health_wellbeing_records.csv",
        "intervention_plans.csv",
        "incident_reports.csv",
        "home_visitations.csv",
        "process_recordings.csv",
        "safehouse_monthly_metrics.csv",
        "public_impact_snapshots.csv"
    ];

    internal static string ResolveCsvRoot(SeedOptions options, IHostEnvironment hostEnvironment)
    {
        if (!string.IsNullOrWhiteSpace(options.CsvPath))
        {
            return Path.IsPathRooted(options.CsvPath)
                ? options.CsvPath
                : Path.GetFullPath(Path.Combine(hostEnvironment.ContentRootPath, options.CsvPath));
        }

        return Path.GetFullPath(Path.Combine(hostEnvironment.ContentRootPath, "..", "..", "ml-pipelines", "lighthouse_csv_v7"));
    }

    internal static List<string> ValidateRequiredFiles(string csvRoot)
    {
        var errors = new List<string>();
        foreach (var file in RequiredFiles)
        {
            var path = Path.Combine(csvRoot, file);
            if (!File.Exists(path))
            {
                errors.Add($"Missing CSV file: {path}");
            }
        }

        return errors;
    }

    internal static List<Dictionary<string, string?>> ReadRows(string csvPath)
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

    internal static string GetString(IReadOnlyDictionary<string, string?> row, string key, string fallback = "")
        => GetNullableString(row, key) ?? fallback;

    internal static string? GetNullableString(IReadOnlyDictionary<string, string?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    internal static int? GetInt(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null)
        {
            return null;
        }

        if (int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var intValue))
        {
            return intValue;
        }

        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue))
        {
            return (int)decimalValue;
        }

        return null;
    }

    internal static decimal? GetDecimal(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null)
        {
            return null;
        }

        return decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : null;
    }

    internal static bool GetBool(IReadOnlyDictionary<string, string?> row, string key, bool fallback = false)
    {
        var text = GetNullableString(row, key);
        if (text is null)
        {
            return fallback;
        }

        if (bool.TryParse(text, out var boolValue))
        {
            return boolValue;
        }

        if (int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var intValue))
        {
            return intValue != 0;
        }

        var normalized = text.Trim().ToLowerInvariant();
        return normalized is "yes" or "y" or "t";
    }

    internal static DateOnly? GetDateOnly(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null)
        {
            return null;
        }

        if (DateOnly.TryParse(text, CultureInfo.InvariantCulture, out var date))
        {
            return date;
        }

        if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var dateTime))
        {
            return DateOnly.FromDateTime(dateTime);
        }

        return null;
    }

    internal static DateTime? GetDateTime(IReadOnlyDictionary<string, string?> row, string key)
    {
        var text = GetNullableString(row, key);
        if (text is null)
        {
            return null;
        }

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

    internal static string NormalizeMetricPayloadJson(string? raw)
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

    internal static string? NormalizeKey(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    internal static string NormalizeCompositeKey(params object?[] parts)
        => string.Join("|", parts.Select(FormatKeyPart));

    private static string FormatKeyPart(object? part) => part switch
    {
        null => string.Empty,
        DateOnly dateOnly => dateOnly.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTime dateTime => dateTime.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
        decimal decimalValue => decimalValue.ToString("0.####", CultureInfo.InvariantCulture),
        bool boolValue => boolValue ? "1" : "0",
        _ => part.ToString()?.Trim().ToUpperInvariant() ?? string.Empty
    };

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
}
