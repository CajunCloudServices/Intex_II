using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class ProcessRecordingsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProcessRecordingResponse>>> GetAll([FromQuery] int? residentId)
    {
        var query = BuildQuery();
        if (residentId.HasValue)
        {
            query = query.Where(x => x.ResidentId == residentId.Value);
        }

        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProcessRecordingResponse>> GetById(int id)
    {
        var recording = await BuildQuery().FirstOrDefaultAsync(x => x.Id == id);
        return recording is null ? NotFound() : Ok(recording);
    }

    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<ProcessRecordingResponse>> Create(ProcessRecordingRequest request)
    {
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
            RestrictedNotes = request.RestrictedNotes
        };

        dbContext.ProcessRecordings.Add(entity);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, await BuildQuery().FirstAsync(x => x.Id == entity.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
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
        entity.RestrictedNotes = request.RestrictedNotes;

        await dbContext.SaveChangesAsync();
        return Ok(await BuildQuery().FirstAsync(x => x.Id == id));
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

        dbContext.ProcessRecordings.Remove(entity);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<ProcessRecordingResponse> BuildQuery() =>
        dbContext.ProcessRecordings
            .Include(x => x.Resident)
            .OrderByDescending(x => x.SessionDate)
            .Select(x => new ProcessRecordingResponse(
                x.Id,
                x.ResidentId,
                x.Resident!.CaseControlNumber,
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
                x.RestrictedNotes));
}
