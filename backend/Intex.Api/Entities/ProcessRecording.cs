namespace Intex.Api.Entities;

public class ProcessRecording
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public DateOnly SessionDate { get; set; }
    public string SocialWorker { get; set; } = string.Empty;
    public string SessionType { get; set; } = string.Empty;
    public int SessionDurationMinutes { get; set; }
    public string EmotionalStateObserved { get; set; } = string.Empty;
    public string EmotionalStateEnd { get; set; } = string.Empty;
    public string SessionNarrative { get; set; } = string.Empty;
    public string InterventionsApplied { get; set; } = string.Empty;
    public string FollowUpActions { get; set; } = string.Empty;
    public bool ProgressNoted { get; set; }
    public bool ConcernsFlagged { get; set; }
    public bool ReferralMade { get; set; }
    public string? RestrictedNotes { get; set; }

    public Resident? Resident { get; set; }
}
