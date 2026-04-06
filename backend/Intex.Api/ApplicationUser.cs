using Microsoft.AspNetCore.Identity;

namespace Intex.Api;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public int? SupporterId { get; set; }
}
