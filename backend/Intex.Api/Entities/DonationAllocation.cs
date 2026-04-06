namespace Intex.Api.Entities;

public class DonationAllocation
{
    public int Id { get; set; }
    public int DonationId { get; set; }
    public int SafehouseId { get; set; }
    public string ProgramArea { get; set; } = string.Empty;
    public decimal AmountAllocated { get; set; }
    public DateOnly AllocationDate { get; set; }
    public string? AllocationNotes { get; set; }

    public Donation? Donation { get; set; }
    public Safehouse? Safehouse { get; set; }
}
