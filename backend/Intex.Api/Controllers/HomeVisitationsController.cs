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
[Route("api/home-visitations")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class HomeVisitationsController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<HomeVisitationResponse>>> GetAll([FromQuery] int? residentId)
    {
        var query = BuildQuery();
        if (residentId.HasValue)
        {
            query = query.Where(x => x.ResidentId == residentId.Value);
        }

        return Ok((await query.ToListAsync()).Select(MapResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HomeVisitationResponse>> GetById(int id)
    {
        var visitation = await BuildQuery().FirstOrDefaultAsync(x => x.Id == id);
        return visitation is null ? NotFound() : Ok(MapResponse(visitation));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<HomeVisitationResponse>> Create(HomeVisitationRequest request)
    {
        var entity = new HomeVisitation
        {
            ResidentId = request.ResidentId,
            VisitDate = request.VisitDate,
            SocialWorker = request.SocialWorker,
            VisitType = request.VisitType,
            LocationVisited = request.LocationVisited,
            FamilyMembersPresent = request.FamilyMembersPresent,
            Purpose = request.Purpose ?? string.Empty,
            Observations = request.Observations ?? string.Empty,
            FamilyCooperationLevel = request.FamilyCooperationLevel,
            SafetyConcernsNoted = request.SafetyConcernsNoted,
            SafetyConcernDetails = request.SafetyConcernDetails,
            FollowUpNeeded = request.FollowUpNeeded,
            FollowUpNotes = request.FollowUpNotes,
            VisitOutcome = request.VisitOutcome
        };

        dbContext.HomeVisitations.Add(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(HomeVisitation), entity.Id, $"Created home visitation for resident #{entity.ResidentId}.", User);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, MapResponse(await BuildQuery().FirstAsync(x => x.Id == entity.Id)));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<HomeVisitationResponse>> Update(int id, HomeVisitationRequest request)
    {
        var entity = await dbContext.HomeVisitations.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.ResidentId = request.ResidentId;
        entity.VisitDate = request.VisitDate;
        entity.SocialWorker = request.SocialWorker;
        entity.VisitType = request.VisitType;
        entity.LocationVisited = request.LocationVisited;
        entity.FamilyMembersPresent = request.FamilyMembersPresent;
        entity.Purpose = request.Purpose ?? string.Empty;
        entity.Observations = request.Observations ?? string.Empty;
        entity.FamilyCooperationLevel = request.FamilyCooperationLevel;
        entity.SafetyConcernsNoted = request.SafetyConcernsNoted;
        entity.SafetyConcernDetails = request.SafetyConcernDetails;
        entity.FollowUpNeeded = request.FollowUpNeeded;
        entity.FollowUpNotes = request.FollowUpNotes;
        entity.VisitOutcome = request.VisitOutcome;

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(HomeVisitation), entity.Id, $"Updated home visitation for resident #{entity.ResidentId}.", User);
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

        var entity = await dbContext.HomeVisitations.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        var summary = $"Deleted home visitation for resident #{entity.ResidentId}.";
        dbContext.HomeVisitations.Remove(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(HomeVisitation), id, summary, User);
        return NoContent();
    }

    private IQueryable<HomeVisitation> BuildQuery() =>
        dbContext.HomeVisitations
            .Include(x => x.Resident)
            .OrderByDescending(x => x.VisitDate);

    private static HomeVisitationResponse MapResponse(HomeVisitation x) =>
        new(
            x.Id,
            x.ResidentId,
            x.Resident?.CaseControlNumber ?? $"Resident {x.ResidentId}",
            x.VisitDate,
            x.SocialWorker,
            x.VisitType,
            x.LocationVisited,
            x.FamilyMembersPresent,
            x.Purpose,
            x.Observations,
            x.FamilyCooperationLevel,
            x.SafetyConcernsNoted,
            x.SafetyConcernDetails,
            x.FollowUpNeeded,
            x.FollowUpNotes,
            x.VisitOutcome);
}
