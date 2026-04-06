namespace Intex.Api.Entities;

public class InterventionPlan
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public string PlanCategory { get; set; } = string.Empty;
    public string PlanDescription { get; set; } = string.Empty;
    public string ServicesProvided { get; set; } = string.Empty;
    public decimal? TargetValue { get; set; }
    public DateOnly TargetDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly? CaseConferenceDate { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Resident? Resident { get; set; }
}
