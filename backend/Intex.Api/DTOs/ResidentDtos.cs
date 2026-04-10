using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record InterventionPlanRequest(
    [Required, StringLength(40)] string PlanCategory,
    [Required, StringLength(500)] string PlanDescription,
    [Required, StringLength(200)] string ServicesProvided,
    [Range(typeof(decimal), "0.01", "999999999.99")] decimal? TargetValue,
    DateOnly TargetDate,
    [Required, StringLength(20), RegularExpression(ValidationPatterns.InterventionStatus)] string Status,
    DateOnly? CaseConferenceDate) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TargetDate == default)
        {
            yield return new ValidationResult("Target date is required.", [nameof(TargetDate)]);
        }

        if (CaseConferenceDate.HasValue && TargetDate != default && CaseConferenceDate.Value > TargetDate)
        {
            yield return new ValidationResult(
                "Case conference date cannot be after the target date.",
                [nameof(CaseConferenceDate), nameof(TargetDate)]);
        }
    }
}

public record ResidentRequest(
    [Required, StringLength(20), RegularExpression(ValidationPatterns.CaseCode)] string CaseControlNumber,
    [Required, StringLength(50), RegularExpression(ValidationPatterns.CaseCode)] string InternalCode,
    [Range(1, int.MaxValue)] int SafehouseId,
    [Required, StringLength(20), RegularExpression(ValidationPatterns.ResidentCaseStatus)] string CaseStatus,
    [Required, StringLength(1), RegularExpression(ValidationPatterns.ResidentSex)] string Sex,
    DateOnly DateOfBirth,
    [Required, StringLength(20), RegularExpression(ValidationPatterns.ResidentBirthStatus)] string BirthStatus,
    [Required, StringLength(120)] string PlaceOfBirth,
    [Required, StringLength(60)] string Religion,
    [Required, StringLength(40), RegularExpression(ValidationPatterns.ResidentCaseCategory)] string CaseCategory,
    bool SubCatOrphaned,
    bool IsTrafficked,
    bool SubCatChildLabor,
    bool IsPhysicalAbuseCase,
    bool IsSexualAbuseCase,
    bool SubCatOsaec,
    bool SubCatCicl,
    bool SubCatAtRisk,
    bool SubCatStreetChild,
    bool SubCatChildWithHiv,
    bool IsPwd,
    [StringLength(80)] string? PwdType,
    bool HasSpecialNeeds,
    [StringLength(200)] string? SpecialNeedsDiagnosis,
    bool FamilyIs4Ps,
    bool FamilySoloParent,
    bool FamilyIndigenous,
    bool FamilyParentPwd,
    bool FamilyInformalSettler,
    DateOnly DateOfAdmission,
    [Required, StringLength(80)] string ReferralSource,
    [StringLength(150)] string? ReferringAgencyPerson,
    DateOnly? DateColbRegistered,
    DateOnly? DateColbObtained,
    [Required, StringLength(120)] string AssignedSocialWorker,
    [Required, StringLength(500)] string InitialCaseAssessment,
    DateOnly? DateCaseStudyPrepared,
    [StringLength(80)] string? ReintegrationType,
    [StringLength(40)] string? ReintegrationStatus,
    [Required, StringLength(20), RegularExpression(ValidationPatterns.RiskLevel)] string InitialRiskLevel,
    [Required, StringLength(20), RegularExpression(ValidationPatterns.RiskLevel)] string CurrentRiskLevel,
    DateOnly? DateEnrolled,
    DateOnly? DateClosed,
    [StringLength(4000)] string? RestrictedNotes,
    [Required, MinLength(1)] List<InterventionPlanRequest> InterventionPlans) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (DateOfBirth == default)
        {
            yield return new ValidationResult("Date of birth is required.", [nameof(DateOfBirth)]);
        }
        else if (DateOfBirth > today)
        {
            yield return new ValidationResult("Date of birth cannot be in the future.", [nameof(DateOfBirth)]);
        }

        if (DateOfAdmission == default)
        {
            yield return new ValidationResult("Date of admission is required.", [nameof(DateOfAdmission)]);
        }
        else if (DateOfBirth != default && DateOfAdmission < DateOfBirth)
        {
            yield return new ValidationResult("Date of admission cannot be earlier than date of birth.", [nameof(DateOfAdmission)]);
        }

        if (IsPwd && string.IsNullOrWhiteSpace(PwdType))
        {
            yield return new ValidationResult("PWD type is required when the resident is marked as PWD.", [nameof(PwdType)]);
        }

        if (HasSpecialNeeds && string.IsNullOrWhiteSpace(SpecialNeedsDiagnosis))
        {
            yield return new ValidationResult(
                "Special needs diagnosis is required when special needs is enabled.",
                [nameof(SpecialNeedsDiagnosis)]);
        }

        if (DateColbRegistered.HasValue && DateColbObtained.HasValue && DateColbObtained < DateColbRegistered)
        {
            yield return new ValidationResult(
                "Date COLB obtained cannot be earlier than date COLB registered.",
                [nameof(DateColbObtained), nameof(DateColbRegistered)]);
        }

        if (DateCaseStudyPrepared.HasValue && DateOfAdmission != default && DateCaseStudyPrepared < DateOfAdmission)
        {
            yield return new ValidationResult(
                "Case study preparation date cannot be earlier than date of admission.",
                [nameof(DateCaseStudyPrepared), nameof(DateOfAdmission)]);
        }

        if (DateEnrolled.HasValue && DateOfAdmission != default && DateEnrolled < DateOfAdmission)
        {
            yield return new ValidationResult(
                "Enrollment date cannot be earlier than date of admission.",
                [nameof(DateEnrolled), nameof(DateOfAdmission)]);
        }

        if (DateClosed.HasValue && DateOfAdmission != default && DateClosed < DateOfAdmission)
        {
            yield return new ValidationResult(
                "Date closed cannot be earlier than date of admission.",
                [nameof(DateClosed), nameof(DateOfAdmission)]);
        }
    }
}

public record InterventionPlanResponse(
    int Id,
    string PlanCategory,
    string PlanDescription,
    string ServicesProvided,
    decimal? TargetValue,
    DateOnly TargetDate,
    string Status,
    DateOnly? CaseConferenceDate);

public record ResidentResponse(
    int Id,
    string CaseControlNumber,
    string InternalCode,
    int SafehouseId,
    string SafehouseName,
    string CaseStatus,
    string Sex,
    DateOnly DateOfBirth,
    string BirthStatus,
    string PlaceOfBirth,
    string Religion,
    string CaseCategory,
    bool SubCatOrphaned,
    bool IsTrafficked,
    bool SubCatChildLabor,
    bool IsPhysicalAbuseCase,
    bool IsSexualAbuseCase,
    bool SubCatOsaec,
    bool SubCatCicl,
    bool SubCatAtRisk,
    bool SubCatStreetChild,
    bool SubCatChildWithHiv,
    bool IsPwd,
    string? PwdType,
    bool HasSpecialNeeds,
    string? SpecialNeedsDiagnosis,
    bool FamilyIs4Ps,
    bool FamilySoloParent,
    bool FamilyIndigenous,
    bool FamilyParentPwd,
    bool FamilyInformalSettler,
    DateOnly DateOfAdmission,
    string ReferralSource,
    string? ReferringAgencyPerson,
    DateOnly? DateColbRegistered,
    DateOnly? DateColbObtained,
    string AssignedSocialWorker,
    string InitialCaseAssessment,
    DateOnly? DateCaseStudyPrepared,
    string? ReintegrationType,
    string? ReintegrationStatus,
    string InitialRiskLevel,
    string CurrentRiskLevel,
    DateOnly? DateEnrolled,
    DateOnly? DateClosed,
    string? RestrictedNotes,
    List<InterventionPlanResponse> InterventionPlans);
