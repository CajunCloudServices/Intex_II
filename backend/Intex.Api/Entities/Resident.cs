namespace Intex.Api.Entities;

public class Resident
{
    public int Id { get; set; }
    public string CaseControlNumber { get; set; } = string.Empty;
    public string InternalCode { get; set; } = string.Empty;
    public int SafehouseId { get; set; }
    public string CaseStatus { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string PlaceOfBirth { get; set; } = string.Empty;
    public string Religion { get; set; } = string.Empty;
    public string CaseCategory { get; set; } = string.Empty;
    public bool IsTrafficked { get; set; }
    public bool IsPhysicalAbuseCase { get; set; }
    public bool IsSexualAbuseCase { get; set; }
    public bool HasSpecialNeeds { get; set; }
    public string? SpecialNeedsDiagnosis { get; set; }
    public bool FamilyIs4Ps { get; set; }
    public bool FamilySoloParent { get; set; }
    public bool FamilyIndigenous { get; set; }
    public bool FamilyInformalSettler { get; set; }
    public DateOnly DateOfAdmission { get; set; }
    public string ReferralSource { get; set; } = string.Empty;
    public string? ReferringAgencyPerson { get; set; }
    public string AssignedSocialWorker { get; set; } = string.Empty;
    public string InitialCaseAssessment { get; set; } = string.Empty;
    public string? ReintegrationType { get; set; }
    public string? ReintegrationStatus { get; set; }
    public string InitialRiskLevel { get; set; } = string.Empty;
    public string CurrentRiskLevel { get; set; } = string.Empty;
    public DateOnly? DateClosed { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? RestrictedNotes { get; set; }

    public Safehouse? Safehouse { get; set; }
    public ICollection<ProcessRecording> ProcessRecordings { get; set; } = new List<ProcessRecording>();
    public ICollection<HomeVisitation> HomeVisitations { get; set; } = new List<HomeVisitation>();
    public ICollection<InterventionPlan> InterventionPlans { get; set; } = new List<InterventionPlan>();
    public ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();
}
