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

    // Hide tiny line-items that are not meaningful to donors (after the first few rows).
    public decimal MinimumAllocationAmount { get; set; } = 10m;

    // Keep donor-facing breakdown focused on highest-impact areas.
    public int MaxProgramsShown { get; set; } = 6;

    /// <summary>
    /// 0–1: blend this much of <see cref="DefaultPreviewAllocationMix"/> into the historical mix so
    /// Operations, Transport, etc. still appear when the database history is dominated by one or two areas.
    /// </summary>
    public decimal PreviewMixBlendWeight { get; set; } = 0.42m;

    /// <summary>
    /// Donor-facing default split (should sum to 1). Used with <see cref="PreviewMixBlendWeight"/>.
    /// </summary>
    public Dictionary<string, decimal> DefaultPreviewAllocationMix { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Education"] = 0.22m,
        ["Wellbeing"] = 0.22m,
        ["Operations"] = 0.22m,
        ["Transport"] = 0.12m,
        ["Maintenance"] = 0.12m,
        ["Outreach"] = 0.10m,
    };

    /// <summary>
    /// Always show at least this many program rows (by historical+blended share) before applying the dollar cutoff.
    /// </summary>
    public int MinimumProgramRowsToShow { get; set; } = 4;
}
