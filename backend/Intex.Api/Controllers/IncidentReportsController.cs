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
[Route("api/incidents")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class IncidentReportsController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<IncidentReportResponse>>> GetAll([FromQuery] int? residentId, [FromQuery] int? safehouseId)
    {
        var query = QueryIncidents();

        if (residentId.HasValue)
        {
            query = query.Where(x => x.ResidentId == residentId.Value);
        }

        if (safehouseId.HasValue)
        {
            query = query.Where(x => x.SafehouseId == safehouseId.Value);
        }

        var incidents = await query.OrderByDescending(x => x.IncidentDate).ToListAsync();
        return Ok(incidents.Select(MapIncident));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IncidentReportResponse>> GetById(int id)
    {
        var incident = await QueryIncidents().FirstOrDefaultAsync(x => x.Id == id);
        return incident is null ? NotFound() : Ok(MapIncident(incident));
    }

    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<IncidentReportResponse>> Create(IncidentReportRequest request)
    {
        var incident = new IncidentReport
        {
            ResidentId = request.ResidentId,
            SafehouseId = request.SafehouseId,
            IncidentDate = request.IncidentDate,
            IncidentType = request.IncidentType,
            Severity = request.Severity,
            Description = request.Description,
            ResponseTaken = request.ResponseTaken,
            Resolved = request.Resolved,
            ResolutionDate = request.ResolutionDate,
            ReportedBy = request.ReportedBy,
            FollowUpRequired = request.FollowUpRequired
        };

        dbContext.IncidentReports.Add(incident);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(IncidentReport), incident.Id, $"Created incident for resident #{incident.ResidentId} at safehouse #{incident.SafehouseId}.", User);

        var createdIncident = await QueryIncidents().FirstAsync(x => x.Id == incident.Id);
        return CreatedAtAction(nameof(GetById), new { id = incident.Id }, MapIncident(createdIncident));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<IncidentReportResponse>> Update(int id, IncidentReportRequest request)
    {
        var incident = await dbContext.IncidentReports.FindAsync(id);
        if (incident is null)
        {
            return NotFound();
        }

        incident.ResidentId = request.ResidentId;
        incident.SafehouseId = request.SafehouseId;
        incident.IncidentDate = request.IncidentDate;
        incident.IncidentType = request.IncidentType;
        incident.Severity = request.Severity;
        incident.Description = request.Description;
        incident.ResponseTaken = request.ResponseTaken;
        incident.Resolved = request.Resolved;
        incident.ResolutionDate = request.ResolutionDate;
        incident.ReportedBy = request.ReportedBy;
        incident.FollowUpRequired = request.FollowUpRequired;

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(IncidentReport), incident.Id, $"Updated incident for resident #{incident.ResidentId}.", User);
        var updatedIncident = await QueryIncidents().FirstAsync(x => x.Id == id);
        return Ok(MapIncident(updatedIncident));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var incident = await dbContext.IncidentReports.FindAsync(id);
        if (incident is null)
        {
            return NotFound();
        }

        var summary = $"Deleted incident for resident #{incident.ResidentId}.";
        dbContext.IncidentReports.Remove(incident);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(IncidentReport), id, summary, User);
        return NoContent();
    }

    private IQueryable<IncidentReport> QueryIncidents() =>
        dbContext.IncidentReports
            .Include(x => x.Resident)
            .Include(x => x.Safehouse);

    private static IncidentReportResponse MapIncident(IncidentReport incident) =>
        new(
            incident.Id,
            incident.ResidentId,
            incident.Resident?.CaseControlNumber ?? "Unknown resident",
            incident.SafehouseId,
            incident.Safehouse?.Name ?? "Unknown safehouse",
            incident.IncidentDate,
            incident.IncidentType,
            incident.Severity,
            incident.Description,
            incident.ResponseTaken,
            incident.Resolved,
            incident.ResolutionDate,
            incident.ReportedBy,
            incident.FollowUpRequired);
}
