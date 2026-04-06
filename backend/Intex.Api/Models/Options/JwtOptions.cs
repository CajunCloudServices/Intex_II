namespace Intex.Api.Models.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "Intex.Api";
    public string Audience { get; set; } = "Intex.Frontend";
    public string Key { get; set; } = "ChangeThisDevelopmentJwtKey12345!";
    public int ExpirationMinutes { get; set; } = 120;
}
