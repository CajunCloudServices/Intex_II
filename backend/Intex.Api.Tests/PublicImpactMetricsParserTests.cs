using Intex.Api.Services;
using Xunit;

namespace Intex.Api.Tests;

public class PublicImpactMetricsParserTests
{
    [Fact]
    public void Parse_ArrayShape_ReturnsDashboardMetrics()
    {
        const string json = """[{"label":"Active residents","value":"28"},{"label":"Process recordings","value":"41"}]""";

        var metrics = PublicImpactMetricsParser.Parse(json);

        Assert.Equal(2, metrics.Count);
        Assert.Equal("Active residents", metrics[0].Label);
        Assert.Equal("28", metrics[0].Value);
        Assert.Equal("Process recordings", metrics[1].Label);
    }

    [Fact]
    public void Parse_LegacyCsvObject_ReturnsMappedMetrics()
    {
        const string json = """
            {"month":"2026-02","avg_health_score":3.94,"avg_education_progress":100.0,"total_residents":60,"donations_total_for_month":3382.25}
            """;

        var metrics = PublicImpactMetricsParser.Parse(json);

        Assert.Equal(5, metrics.Count);
        Assert.Equal("Reporting month", metrics[0].Label);
        Assert.Equal("2026-02", metrics[0].Value);
        Assert.Contains("Total residents", metrics[1].Label);
        Assert.Equal("60", metrics[1].Value);
        Assert.Contains("Donations", metrics[4].Label);
    }

    [Fact]
    public void Parse_EmptyOrInvalid_ReturnsEmpty()
    {
        Assert.Empty(PublicImpactMetricsParser.Parse(null));
        Assert.Empty(PublicImpactMetricsParser.Parse(""));
        Assert.Empty(PublicImpactMetricsParser.Parse("{not json"));
    }

    [Fact]
    public void Parse_EmptyObject_ReturnsEmpty()
    {
        Assert.Empty(PublicImpactMetricsParser.Parse("{}"));
    }
}
