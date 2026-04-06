namespace Intex.Api.Entities;

public class Supporter
{
    public int Id { get; set; }
    public string SupporterType { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Status { get; set; } = "Active";
    public DateOnly? FirstDonationDate { get; set; }
    public string AcquisitionChannel { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
