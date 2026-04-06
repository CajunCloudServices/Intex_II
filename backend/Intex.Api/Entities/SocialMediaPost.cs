namespace Intex.Api.Entities;

public class SocialMediaPost
{
    public int Id { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string PlatformPostId { get; set; } = string.Empty;
    public string PostUrl { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public string PostType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public string? Hashtags { get; set; }
    public bool HasCallToAction { get; set; }
    public string? CallToActionType { get; set; }
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public bool FeaturesResidentStory { get; set; }
    public string? CampaignName { get; set; }
    public bool IsBoosted { get; set; }
    public decimal? BoostBudgetPhp { get; set; }
    public int Impressions { get; set; }
    public int Reach { get; set; }
    public int Likes { get; set; }
    public int Comments { get; set; }
    public int Shares { get; set; }
    public int ClickThroughs { get; set; }
    public decimal EngagementRate { get; set; }
    public int DonationReferrals { get; set; }
    public decimal EstimatedDonationValuePhp { get; set; }
}
