using System.ComponentModel.DataAnnotations;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/audit-log")]
[Authorize(Policy = Policies.AdminOnly)]
public class AuditLogController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLogResponse>>> GetAll(
        [FromQuery] string? entityType,
        [FromQuery, Range(1, int.MaxValue)] int? entityId,
        [FromQuery, StringLength(40)] string? actionType)
    {
        var query = dbContext.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(x => x.EntityType == entityType);
        }

        if (entityId.HasValue)
        {
            query = query.Where(x => x.EntityId == entityId.Value);
        }

        if (!string.IsNullOrWhiteSpace(actionType))
        {
            query = query.Where(x => x.ActionType == actionType);
        }

        var rows = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(250)
            .Select(x => new AuditLogResponse(
                x.Id,
                x.ActionType,
                x.EntityType,
                x.EntityId,
                x.ActorUserId,
                x.ActorEmail,
                x.CreatedAtUtc,
                x.Summary))
            .ToListAsync();

        return Ok(rows);
    }
}
