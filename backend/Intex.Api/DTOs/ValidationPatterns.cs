namespace Intex.Api.DTOs;

public static class ValidationPatterns
{
    public const string CaseCode = "^[A-Za-z0-9][A-Za-z0-9-]{1,49}$";
    public const string CurrencyCode = "^[A-Z]{3}$";
    public const string Phone = @"^\+?[0-9()\- ]{7,20}$";

    public const string ResidentCaseStatus = "^(Active|Closed|Transferred)$";
    public const string ResidentCaseCategory = "^(Neglected|Surrendered|Foundling|Abandoned|Trafficking|PhysicalAbuse|SexualAbuse|Abandonment|FamilyConflict|Other)$";
    public const string ResidentSex = "^(F|M)$";
    public const string ResidentBirthStatus = "^(Marital|Non-Marital|Unknown)$";
    public const string RiskLevel = "^(Low|Medium|High|Critical)$";
    public const string InterventionStatus = "^(Open|InProgress|Closed|Deferred)$";

    public const string DonationType = "^(Monetary|InKind|Time|Skills|SocialMedia)$";
    public const string DonationChannel = "^(Direct|Website|Campaign|SocialMedia|Event|Referral)$";

    public const string SupporterType = "^(MonetaryDonor|InKindDonor|Volunteer|CorporatePartner|Foundation|Advocate|CommunityPartner)$";
    public const string SupporterStatus = "^(Active|Inactive)$";
}
