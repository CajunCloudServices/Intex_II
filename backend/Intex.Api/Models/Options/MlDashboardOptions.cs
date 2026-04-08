namespace Intex.Api.Models.Options;

public class MlDashboardOptions
{
    public const string SectionName = "MlDashboard";

    /// <summary>
    /// Optional override for the directory containing generated ML dashboard JSON (relative to content root or absolute).
    /// </summary>
    public string? DataDirectory { get; set; }
}
