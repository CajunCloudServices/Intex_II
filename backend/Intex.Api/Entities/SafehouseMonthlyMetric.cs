namespace Intex.Api.Entities;

public class SafehouseMonthlyMetric
{
    public int Id { get; set; }
    public int SafehouseId { get; set; }
    public DateOnly MonthStart { get; set; }
    public DateOnly MonthEnd { get; set; }
    public int ActiveResidents { get; set; }
    public decimal AvgEducationProgress { get; set; }
    public decimal AvgHealthScore { get; set; }
    public int ProcessRecordingCount { get; set; }
    public int HomeVisitationCount { get; set; }
    public int IncidentCount { get; set; }
    public string? Notes { get; set; }

    public Safehouse? Safehouse { get; set; }
}
