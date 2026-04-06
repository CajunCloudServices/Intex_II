namespace Intex.Api.Authorization;

public static class Policies
{
    public const string StaffOrAdmin = "StaffOrAdmin";
    public const string AdminOnly = "AdminOnly";
    public const string DonorOnly = "DonorOnly";
}
