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
        ["Transport"] = 300m,
        ["Maintenance"] = 100m,
        ["Outreach"] = 100m
    };

    public Dictionary<string, string> ProgramAreaOutcomeUnits { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Education"] = "school kits",
        ["Wellbeing"] = "counseling sessions",
        ["Operations"] = "meal equivalents",
        ["Transport"] = "home visitation trips",
        ["Maintenance"] = "safehouse upkeep units",
        ["Outreach"] = "community outreach activities"
    };

    // Heuristic used for donor-facing "lives impacted" estimate.
    public decimal AverageCostPerVictim { get; set; } = 250m;

    // Hide tiny line-items that are not meaningful to donors.
    public decimal MinimumAllocationAmount { get; set; } = 10m;

    // Keep donor-facing breakdown focused on highest-impact areas.
    public int MaxProgramsShown { get; set; } = 6;
}
