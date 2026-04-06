namespace Intex.Api.Entities;

public class HomeVisitation
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public DateOnly VisitDate { get; set; }
    public string SocialWorker { get; set; } = string.Empty;
    public string VisitType { get; set; } = string.Empty;
    public string LocationVisited { get; set; } = string.Empty;
    public string FamilyMembersPresent { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string Observations { get; set; } = string.Empty;
    public string FamilyCooperationLevel { get; set; } = string.Empty;
    public bool SafetyConcernsNoted { get; set; }
    public bool FollowUpNeeded { get; set; }
    public string? FollowUpNotes { get; set; }
    public string VisitOutcome { get; set; } = string.Empty;

    public Resident? Resident { get; set; }
}
