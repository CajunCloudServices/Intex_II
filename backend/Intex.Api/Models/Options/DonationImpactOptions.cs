namespace Intex.Api.Models.Options;

public class DonationImpactOptions
{
    public const string SectionName = "DonationImpact";

    // Costs are interpreted as currency-per-unit.
    public Dictionary<string, decimal> ProgramAreaUnitCosts { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Education"] = 150m,
        ["Wellbeing"] = 200m,
        ["Operations"] = 50m,
        ["Transport"] = 300m
    };

    public Dictionary<string, string> ProgramAreaOutcomeUnits { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Education"] = "school kits",
        ["Wellbeing"] = "counseling sessions",
        ["Operations"] = "meal equivalents",
        ["Transport"] = "home visitation trips"
    };
}
