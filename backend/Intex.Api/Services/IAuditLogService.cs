using System.Security.Claims;

namespace Intex.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(string actionType, string entityType, int entityId, string summary, ClaimsPrincipal user);
}
