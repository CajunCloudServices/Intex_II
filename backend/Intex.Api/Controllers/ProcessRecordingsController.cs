using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class ProcessRecordingsController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProcessRecordingResponse>>> GetAll([FromQuery] int? residentId)
    {
        var query = BuildQuery();
        if (residentId.HasValue)
        {
            query = query.Where(x => x.ResidentId == residentId.Value);
        }

        return Ok((await query.ToListAsync()).Select(MapResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProcessRecordingResponse>> GetById(int id)
    {
        var recording = await BuildQuery().FirstOrDefaultAsync(x => x.Id == id);
        return recording is null ? NotFound() : Ok(MapResponse(recording));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<ProcessRecordingResponse>> Create(ProcessRecordingRequest request)
    {
        var canManageRestrictedNotes = User.IsInRole(RoleNames.Admin);
        var entity = new ProcessRecording
        {
            ResidentId = request.ResidentId,
            SessionDate = request.SessionDate,
            SocialWorker = request.SocialWorker,
            SessionType = request.SessionType,
            SessionDurationMinutes = request.SessionDurationMinutes,
            EmotionalStateObserved = request.EmotionalStateObserved,
            EmotionalStateEnd = request.EmotionalStateEnd,
            SessionNarrative = request.SessionNarrative,
            InterventionsApplied = request.InterventionsApplied,
            FollowUpActions = request.FollowUpActions,
            ProgressNoted = request.ProgressNoted,
            ConcernsFlagged = request.ConcernsFlagged,
            ReferralMade = request.ReferralMade,
            RestrictedNotes = canManageRestrictedNotes ? request.RestrictedNotes : null
        };

        dbContext.ProcessRecordings.Add(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(ProcessRecording), entity.Id, $"Created process recording for resident #{entity.ResidentId}.", User);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, MapResponse(await BuildQuery().FirstAsync(x => x.Id == entity.Id)));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<ProcessRecordingResponse>> Update(int id, ProcessRecordingRequest request)
    {
        var entity = await dbContext.ProcessRecordings.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.ResidentId = request.ResidentId;
        entity.SessionDate = request.SessionDate;
        entity.SocialWorker = request.SocialWorker;
        entity.SessionType = request.SessionType;
        entity.SessionDurationMinutes = request.SessionDurationMinutes;
        entity.EmotionalStateObserved = request.EmotionalStateObserved;
        entity.EmotionalStateEnd = request.EmotionalStateEnd;
        entity.SessionNarrative = request.SessionNarrative;
        entity.InterventionsApplied = request.InterventionsApplied;
        entity.FollowUpActions = request.FollowUpActions;
        entity.ProgressNoted = request.ProgressNoted;
        entity.ConcernsFlagged = request.ConcernsFlagged;
        entity.ReferralMade = request.ReferralMade;
        if (User.IsInRole(RoleNames.Admin))
        {
            entity.RestrictedNotes = request.RestrictedNotes;
        }

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(ProcessRecording), entity.Id, $"Updated process recording for resident #{entity.ResidentId}.", User);
        return Ok(MapResponse(await BuildQuery().FirstAsync(x => x.Id == id)));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var entity = await dbContext.ProcessRecordings.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        var summary = $"Deleted process recording for resident #{entity.ResidentId}.";
        dbContext.ProcessRecordings.Remove(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(ProcessRecording), id, summary, User);
        return NoContent();
    }

    private IQueryable<ProcessRecording> BuildQuery() =>
        dbContext.ProcessRecordings
            .Include(x => x.Resident)
            .OrderByDescending(x => x.SessionDate);

    private static ProcessRecordingResponse MapResponse(ProcessRecording x) =>
        new(
            x.Id,
            x.ResidentId,
            x.Resident?.CaseControlNumber ?? $"Resident {x.ResidentId}",
            x.SessionDate,
            x.SocialWorker,
            x.SessionType,
            x.SessionDurationMinutes,
            x.EmotionalStateObserved,
            x.EmotionalStateEnd,
            x.SessionNarrative,
            x.InterventionsApplied,
            x.FollowUpActions,
            x.ProgressNoted,
            x.ConcernsFlagged,
            x.ReferralMade,
            x.RestrictedNotes);
}
