namespace Intex.Api.Entities;

/// <summary>
/// Public-facing impact report row. <see cref="SnapshotDate"/> is the first calendar day of the
/// reporting month the snapshot summarizes (e.g. 2026-03-01 for March 2026 highlights), not an arbitrary “as of” instant.
/// </summary>
public class PublicImpactSnapshot
{
    public int Id { get; set; }
    public DateOnly SnapshotDate { get; set; }
    public string Headline { get; set; } = string.Empty;
    public string SummaryText { get; set; } = string.Empty;
    public string MetricPayloadJson { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public DateOnly? PublishedAt { get; set; }
}
