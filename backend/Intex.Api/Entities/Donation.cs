namespace Intex.Api.Entities;

public class Donation
{
    public int Id { get; set; }
    public int SupporterId { get; set; }
    public string DonationType { get; set; } = string.Empty;
    public DateOnly DonationDate { get; set; }
    public string ChannelSource { get; set; } = string.Empty;
    public string? CurrencyCode { get; set; }
    public decimal? Amount { get; set; }
    public decimal EstimatedValue { get; set; }
    public string ImpactUnit { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
    public string? CampaignName { get; set; }
    public string? Notes { get; set; }

    public Supporter? Supporter { get; set; }
    public ICollection<DonationAllocation> Allocations { get; set; } = new List<DonationAllocation>();
}
