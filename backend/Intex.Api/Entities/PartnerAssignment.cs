namespace Intex.Api.Entities;

public class PartnerAssignment
{
    public int Id { get; set; }
    public int PartnerId { get; set; }
    public int SafehouseId { get; set; }
    public string ProgramArea { get; set; } = string.Empty;
    public DateOnly? AssignmentStart { get; set; }
    public DateOnly? AssignmentEnd { get; set; }
    public string? ResponsibilityNotes { get; set; }
    public bool IsPrimary { get; set; }
    public string Status { get; set; } = string.Empty;

    public Partner? Partner { get; set; }
    public Safehouse? Safehouse { get; set; }
}
