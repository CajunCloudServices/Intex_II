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
[Route("api/case-conferences")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class CaseConferencesController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CaseConferenceResponse>>> GetAll([FromQuery] int? residentId)
    {
        var query = BuildQuery();
        if (residentId.HasValue)
        {
            query = query.Where(x => x.ResidentId == residentId.Value);
        }

        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CaseConferenceResponse>> GetById(int id)
    {
        var conference = await BuildQuery().FirstOrDefaultAsync(x => x.Id == id);
        return conference is null ? NotFound() : Ok(conference);
    }

    [HttpPost]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<CaseConferenceResponse>> Create(CaseConferenceRequest request)
    {
        var entity = MapRequest(new CaseConference(), request);
        dbContext.CaseConferences.Add(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(CaseConference), entity.Id, $"Created case conference for resident #{entity.ResidentId}.", User);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, await BuildQuery().FirstAsync(x => x.Id == entity.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<CaseConferenceResponse>> Update(int id, CaseConferenceRequest request)
    {
        var entity = await dbContext.CaseConferences.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        MapRequest(entity, request);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(CaseConference), entity.Id, $"Updated case conference for resident #{entity.ResidentId}.", User);
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

        var entity = await dbContext.CaseConferences.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        var summary = $"Deleted case conference for resident #{entity.ResidentId}.";
        dbContext.CaseConferences.Remove(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(CaseConference), id, summary, User);
        return NoContent();
    }

    private static CaseConference MapRequest(CaseConference entity, CaseConferenceRequest request)
    {
        entity.ResidentId = request.ResidentId;
        entity.ConferenceDate = request.ConferenceDate;
        entity.LeadWorker = request.LeadWorker;
        entity.Attendees = request.Attendees ?? string.Empty;
        entity.Purpose = request.Purpose ?? string.Empty;
        entity.DecisionsMade = request.DecisionsMade ?? string.Empty;
        entity.FollowUpActions = request.FollowUpActions ?? string.Empty;
        entity.NextReviewDate = request.NextReviewDate;
        entity.Status = request.Status;
        return entity;
    }

    private IQueryable<CaseConferenceResponse> BuildQuery() =>
        dbContext.CaseConferences
            .Include(x => x.Resident)
            .OrderByDescending(x => x.ConferenceDate)
            .Select(x => new CaseConferenceResponse(
                x.Id,
                x.ResidentId,
                x.Resident?.CaseControlNumber ?? $"Resident {x.ResidentId}",
                x.ConferenceDate,
                x.LeadWorker,
                x.Attendees,
                x.Purpose,
                x.DecisionsMade,
                x.FollowUpActions,
                x.NextReviewDate,
                x.Status));
}
