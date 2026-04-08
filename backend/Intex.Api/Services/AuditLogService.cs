using System.Security.Claims;
using Intex.Api.Data;
using Intex.Api.Entities;

namespace Intex.Api.Services;

public class AuditLogService(ApplicationDbContext dbContext) : IAuditLogService
{
    public async Task LogAsync(string actionType, string entityType, int entityId, string summary, ClaimsPrincipal user)
    {
        var actorUserId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var actorEmail = user.FindFirstValue(ClaimTypes.Email) ?? "unknown";

        dbContext.AuditLogs.Add(new AuditLog
        {
            ActionType = actionType,
            EntityType = entityType,
            EntityId = entityId,
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            CreatedAtUtc = DateTime.UtcNow,
            Summary = summary
        });

        await dbContext.SaveChangesAsync();
    }
}
