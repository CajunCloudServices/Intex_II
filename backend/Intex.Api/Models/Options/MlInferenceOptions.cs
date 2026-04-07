namespace Intex.Api.Models.Options;

public class MlInferenceOptions
{
    public const string SectionName = "MlInference";

    public string BaseUrl { get; set; } = "http://localhost:8000";
    public string ReintegrationEndpoint { get; set; } = "/predict/reintegration";
    public int TimeoutSeconds { get; set; } = 10;
    public bool EnableLocalFallback { get; set; } = true;
}
