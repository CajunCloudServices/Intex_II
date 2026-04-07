namespace Intex.Api.DTOs;

public record AuditLogResponse(
    int Id,
    string ActionType,
    string EntityType,
    int EntityId,
    string? ActorUserId,
    string ActorEmail,
    DateTime CreatedAtUtc,
    string Summary);
