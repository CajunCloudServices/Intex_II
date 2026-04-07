namespace Intex.Api.Models.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public const string DevelopmentPlaceholderKey = "LOCAL_DEV_ONLY_REPLACE_WITH_SECRET_KEY_1234567890";

    public string Issuer { get; set; } = "Intex.Api";
    public string Audience { get; set; } = "Intex.Frontend";
    public string Key { get; set; } = DevelopmentPlaceholderKey;
    public int ExpirationMinutes { get; set; } = 120;
}
