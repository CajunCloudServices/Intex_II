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
[Route("api/[controller]")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class ResidentsController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ResidentResponse>>> GetAll([FromQuery] string? status, [FromQuery] int? safehouseId)
    {
        var query = BuildResidentEntityQuery();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x => x.CaseStatus == status);
        }

        if (safehouseId.HasValue)
        {
            query = query.Where(x => x.SafehouseId == safehouseId.Value);
        }

        var residents = await query
            .OrderBy(x => x.CaseControlNumber)
            .ToListAsync();

        return Ok(residents.Select(MapResidentResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ResidentResponse>> GetById(int id)
    {
        var resident = await BuildResidentEntityQuery().FirstOrDefaultAsync(x => x.Id == id);
        return resident is null ? NotFound() : Ok(MapResidentResponse(resident));
    }

    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<ResidentResponse>> Create(ResidentRequest request)
    {
        var resident = MapResident(new Resident { CreatedAtUtc = DateTime.UtcNow }, request);
        dbContext.Residents.Add(resident);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(Resident), resident.Id, $"Created resident {resident.CaseControlNumber}.", User);

        var createdResident = await BuildResidentEntityQuery().FirstAsync(x => x.Id == resident.Id);
        return CreatedAtAction(nameof(GetById), new { id = resident.Id }, MapResidentResponse(createdResident));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<ResidentResponse>> Update(int id, ResidentRequest request)
    {
        var resident = await dbContext.Residents
            .Include(x => x.InterventionPlans)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (resident is null)
        {
            return NotFound();
        }

        MapResident(resident, request);
        dbContext.InterventionPlans.RemoveRange(resident.InterventionPlans);
        resident.InterventionPlans = request.InterventionPlans.Select(plan => new InterventionPlan
        {
            PlanCategory = plan.PlanCategory,
            PlanDescription = plan.PlanDescription,
            ServicesProvided = plan.ServicesProvided,
            TargetValue = plan.TargetValue,
            TargetDate = plan.TargetDate,
            Status = plan.Status,
            CaseConferenceDate = plan.CaseConferenceDate,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        }).ToList();

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(Resident), resident.Id, $"Updated resident {resident.CaseControlNumber}.", User);
        var updatedResident = await BuildResidentEntityQuery().FirstAsync(x => x.Id == id);
        return Ok(MapResidentResponse(updatedResident));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var resident = await dbContext.Residents.FindAsync(id);
        if (resident is null)
        {
            return NotFound();
        }

        var summary = $"Deleted resident {resident.CaseControlNumber}.";
        dbContext.Residents.Remove(resident);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(Resident), id, summary, User);
        return NoContent();
    }

    private Resident MapResident(Resident resident, ResidentRequest request)
    {
        resident.CaseControlNumber = request.CaseControlNumber;
        resident.InternalCode = request.InternalCode;
        resident.SafehouseId = request.SafehouseId;
        resident.CaseStatus = request.CaseStatus;
        resident.DateOfBirth = request.DateOfBirth;
        resident.PlaceOfBirth = request.PlaceOfBirth;
        resident.Religion = request.Religion;
        resident.CaseCategory = request.CaseCategory;
        resident.IsTrafficked = request.IsTrafficked;
        resident.IsPhysicalAbuseCase = request.IsPhysicalAbuseCase;
        resident.IsSexualAbuseCase = request.IsSexualAbuseCase;
        resident.HasSpecialNeeds = request.HasSpecialNeeds;
        resident.SpecialNeedsDiagnosis = request.SpecialNeedsDiagnosis;
        resident.FamilyIs4Ps = request.FamilyIs4Ps;
        resident.FamilySoloParent = request.FamilySoloParent;
        resident.FamilyIndigenous = request.FamilyIndigenous;
        resident.FamilyInformalSettler = request.FamilyInformalSettler;
        resident.DateOfAdmission = request.DateOfAdmission;
        resident.ReferralSource = request.ReferralSource;
        resident.ReferringAgencyPerson = request.ReferringAgencyPerson;
        resident.AssignedSocialWorker = request.AssignedSocialWorker;
        resident.InitialCaseAssessment = request.InitialCaseAssessment;
        resident.ReintegrationType = request.ReintegrationType;
        resident.ReintegrationStatus = request.ReintegrationStatus;
        resident.InitialRiskLevel = request.InitialRiskLevel;
        resident.CurrentRiskLevel = request.CurrentRiskLevel;
        resident.DateClosed = request.DateClosed;
        resident.RestrictedNotes = request.RestrictedNotes;

        if (resident.InterventionPlans.Count == 0 && request.InterventionPlans.Count > 0)
        {
            resident.InterventionPlans = request.InterventionPlans.Select(plan => new InterventionPlan
            {
                PlanCategory = plan.PlanCategory,
                PlanDescription = plan.PlanDescription,
                ServicesProvided = plan.ServicesProvided,
                TargetValue = plan.TargetValue,
                TargetDate = plan.TargetDate,
                Status = plan.Status,
                CaseConferenceDate = plan.CaseConferenceDate,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            }).ToList();
        }

        return resident;
    }

    private IQueryable<Resident> BuildResidentEntityQuery() =>
        dbContext.Residents
            .Include(x => x.Safehouse)
            .Include(x => x.InterventionPlans);

    private static ResidentResponse MapResidentResponse(Resident resident) =>
        new(
            resident.Id,
            resident.CaseControlNumber,
            resident.InternalCode,
            resident.SafehouseId,
            resident.Safehouse?.Name ?? "Unknown safehouse",
            resident.CaseStatus,
            resident.DateOfBirth,
            resident.PlaceOfBirth,
            resident.Religion,
            resident.CaseCategory,
            resident.IsTrafficked,
            resident.IsPhysicalAbuseCase,
            resident.IsSexualAbuseCase,
            resident.HasSpecialNeeds,
            resident.SpecialNeedsDiagnosis,
            resident.FamilyIs4Ps,
            resident.FamilySoloParent,
            resident.FamilyIndigenous,
            resident.FamilyInformalSettler,
            resident.DateOfAdmission,
            resident.ReferralSource,
            resident.ReferringAgencyPerson,
            resident.AssignedSocialWorker,
            resident.InitialCaseAssessment,
            resident.ReintegrationType,
            resident.ReintegrationStatus,
            resident.InitialRiskLevel,
            resident.CurrentRiskLevel,
            resident.DateClosed,
            resident.RestrictedNotes,
            resident.InterventionPlans
                .OrderBy(plan => plan.TargetDate)
                .Select(plan => new InterventionPlanResponse(
                    plan.Id,
                    plan.PlanCategory,
                    plan.PlanDescription,
                    plan.ServicesProvided,
                    plan.TargetValue,
                    plan.TargetDate,
                    plan.Status,
                    plan.CaseConferenceDate))
                .ToList());
}
