namespace Intex.Api.Authorization;

public static class RoleNames
{
    public const string Admin = "Admin";
    public const string Staff = "Staff";
    public const string Donor = "Donor";

    public static readonly string[] All = [Admin, Staff, Donor];
}
