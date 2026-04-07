namespace Intex.Api.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string? ActorUserId { get; set; }
    public string ActorEmail { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public string Summary { get; set; } = string.Empty;
}
