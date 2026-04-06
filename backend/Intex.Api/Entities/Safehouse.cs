namespace Intex.Api.Entities;

public class Safehouse
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Country { get; set; } = "Philippines";
    public DateOnly OpenDate { get; set; }
    public string Status { get; set; } = "Active";
    public int CapacityGirls { get; set; }
    public int CapacityStaff { get; set; }
    public int CurrentOccupancy { get; set; }
    public string? Notes { get; set; }

    public ICollection<DonationAllocation> DonationAllocations { get; set; } = new List<DonationAllocation>();
    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
    public ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();
}
