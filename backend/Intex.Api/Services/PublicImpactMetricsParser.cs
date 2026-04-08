using System.Globalization;
using System.Text.Json;
using Intex.Api.DTOs;

namespace Intex.Api.Services;

/// <summary>
/// Parses <see cref="Entities.PublicImpactSnapshot.MetricPayloadJson"/> as either the dashboard array shape
/// <c>[{ "label", "value" }, …]</c> or the legacy CSV object shape
/// <c>{ month, total_residents, avg_health_score, avg_education_progress, donations_total_for_month }</c>.
/// </summary>
public static class PublicImpactMetricsParser
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static IReadOnlyList<PublicImpactMetricDto> Parse(string? metricPayloadJson)
    {
        if (string.IsNullOrWhiteSpace(metricPayloadJson))
        {
            return Array.Empty<PublicImpactMetricDto>();
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(metricPayloadJson);
        }
        catch (JsonException)
        {
            return Array.Empty<PublicImpactMetricDto>();
        }

        using (doc)
        {
            var root = doc.RootElement;
            return root.ValueKind switch
            {
                JsonValueKind.Array => DeserializeArray(root),
                JsonValueKind.Object => MapLegacyObject(root),
                _ => Array.Empty<PublicImpactMetricDto>()
            };
        }
    }

    private static IReadOnlyList<PublicImpactMetricDto> DeserializeArray(JsonElement root)
    {
        try
        {
            return JsonSerializer.Deserialize<List<PublicImpactMetricDto>>(root.GetRawText(), SerializerOptions)
                   ?? new List<PublicImpactMetricDto>();
        }
        catch (JsonException)
        {
            return Array.Empty<PublicImpactMetricDto>();
        }
    }

    private static IReadOnlyList<PublicImpactMetricDto> MapLegacyObject(JsonElement root)
    {
        var list = new List<PublicImpactMetricDto>();

        if (TryGetString(root, "month", out var month) && !string.IsNullOrWhiteSpace(month))
        {
            list.Add(new PublicImpactMetricDto("Reporting month", month.Trim()));
        }

        if (TryGetNumber(root, "total_residents", out var residents))
        {
            list.Add(new PublicImpactMetricDto(
                "Total residents",
                Math.Round(residents, MidpointRounding.AwayFromZero).ToString(CultureInfo.InvariantCulture)));
        }

        if (TryGetNumber(root, "avg_health_score", out var health))
        {
            list.Add(new PublicImpactMetricDto(
                "Average health score",
                health.ToString("0.##", CultureInfo.InvariantCulture)));
        }

        if (TryGetNumber(root, "avg_education_progress", out var edu))
        {
            list.Add(new PublicImpactMetricDto(
                "Average education progress",
                edu.ToString("0.##", CultureInfo.InvariantCulture) + "%"));
        }

        if (TryGetNumber(root, "donations_total_for_month", out var donations))
        {
            list.Add(new PublicImpactMetricDto(
                "Donations (month)",
                donations.ToString("C2", CultureInfo.CreateSpecificCulture("en-US"))));
        }

        return list;
    }

    private static bool TryGetString(JsonElement obj, string name, out string value)
    {
        if (!TryGetProperty(obj, name, out var el) || el.ValueKind != JsonValueKind.String)
        {
            value = string.Empty;
            return false;
        }

        value = el.GetString() ?? string.Empty;
        return true;
    }

    private static bool TryGetNumber(JsonElement obj, string name, out double value)
    {
        value = 0;
        if (!TryGetProperty(obj, name, out var el))
        {
            return false;
        }

        return el.ValueKind switch
        {
            JsonValueKind.Number => el.TryGetDouble(out value),
            JsonValueKind.String => double.TryParse(el.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out value),
            _ => false
        };
    }

    private static bool TryGetProperty(JsonElement obj, string name, out JsonElement value)
    {
        foreach (var p in obj.EnumerateObject())
        {
            if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = p.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}
