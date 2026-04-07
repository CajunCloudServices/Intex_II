namespace Intex.Api.DTOs;

public record ReintegrationFeaturePayload(
    int ResidentId,
    int InitialRiskScore,
    int IsTrafficked,
    int IsPhysicalAbuseCase,
    int IsSexualAbuseCase,
    int HasSpecialNeeds,
    int FamilyIs4Ps,
    int FamilySoloParent,
    int FamilyInformalSettler,
    decimal AvgHealthScore,
    decimal HealthTrend,
    decimal AvgEducationProgress,
    decimal EducationTrend,
    int SessionCount,
    decimal AvgSessionDuration,
    decimal AvgEmotionShift,
    decimal ProgressNotedRate,
    decimal ConcernsFlaggedRate,
    int IncidentCount,
    int HighSeverityIncidentCount);

public record ReintegrationPredictionRequest(ReintegrationFeaturePayload Features);

public record ReintegrationPredictionResponse(
    int ResidentId,
    decimal RiskScore,
    decimal PositiveProbability,
    IReadOnlyList<string> TopRiskFactors,
    string RecommendedAction,
    string ModelVersion,
    DateTime ScoredAtUtc,
    string Source);

public record ChurnFeaturePayload(
    int SupporterId,
    decimal LifetimeDonationAmount,
    int DonationCount,
    int DaysSinceLastDonation,
    int IsRecurringDonor,
    int IsActiveStatus,
    string AcquisitionChannel);

public record SocialConversionFeaturePayload(
    int PostId,
    string Platform,
    string PostType,
    string MediaType,
    string SentimentTone,
    int PostHour,
    int NumHashtags,
    int HasCallToAction,
    int FeaturesResidentStory,
    int IsBoosted,
    decimal BoostBudgetPhp);

public record CounselingFeaturePayload(
    int RecordingId,
    int ResidentId,
    int SessionDurationMinutes,
    int ProgressNoted,
    int ConcernsFlagged,
    int ReferralMade,
    string SessionType,
    string EmotionalStateObserved,
    string EmotionalStateEnd);
