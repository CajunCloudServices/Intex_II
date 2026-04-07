namespace Intex.Api.Entities;

public class EducationRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public DateOnly RecordDate { get; set; }
    public string EducationLevel { get; set; } = string.Empty;
    public string? SchoolName { get; set; }
    public string EnrollmentStatus { get; set; } = string.Empty;
    public decimal AttendanceRate { get; set; }
    public decimal ProgressPercent { get; set; }
    public string CompletionStatus { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public Resident? Resident { get; set; }
}
