namespace Intex.Api.Entities;

public class CaseConference
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public DateOnly ConferenceDate { get; set; }
    public string LeadWorker { get; set; } = string.Empty;
    public string Attendees { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string DecisionsMade { get; set; } = string.Empty;
    public string FollowUpActions { get; set; } = string.Empty;
    public DateOnly? NextReviewDate { get; set; }
    public string Status { get; set; } = string.Empty;

    public Resident? Resident { get; set; }
}
