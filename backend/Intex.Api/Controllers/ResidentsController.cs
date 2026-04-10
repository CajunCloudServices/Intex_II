using System.ComponentModel.DataAnnotations;
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
    public async Task<ActionResult<IEnumerable<ResidentResponse>>> GetAll(
        [FromQuery, StringLength(20), RegularExpression(ValidationPatterns.ResidentCaseStatus)] string? status,
        [FromQuery, Range(1, int.MaxValue)] int? safehouseId)
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
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<ResidentResponse>> Create(ResidentRequest request)
    {
        var validationResult = await ValidateResidentRequestAsync(request);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var resident = MapResident(new Resident { CreatedAtUtc = DateTime.UtcNow }, request);
        dbContext.Residents.Add(resident);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(Resident), resident.Id, $"Created resident {resident.CaseControlNumber}.", User);

        var createdResident = await BuildResidentEntityQuery().FirstAsync(x => x.Id == resident.Id);
        return CreatedAtAction(nameof(GetById), new { id = resident.Id }, MapResidentResponse(createdResident));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.StaffOrAdmin)]
    public async Task<ActionResult<ResidentResponse>> Update(int id, ResidentRequest request)
    {
        var validationResult = await ValidateResidentRequestAsync(request, id);
        if (validationResult is not null)
        {
            return validationResult;
        }

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
    [Authorize(Policy = Policies.StaffOrAdmin)]
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
        resident.Sex = request.Sex;
        resident.DateOfBirth = request.DateOfBirth;
        resident.BirthStatus = request.BirthStatus;
        resident.PlaceOfBirth = request.PlaceOfBirth;
        resident.Religion = request.Religion;
        resident.CaseCategory = request.CaseCategory;
        resident.SubCatOrphaned = request.SubCatOrphaned;
        resident.IsTrafficked = request.IsTrafficked;
        resident.SubCatChildLabor = request.SubCatChildLabor;
        resident.IsPhysicalAbuseCase = request.IsPhysicalAbuseCase;
        resident.IsSexualAbuseCase = request.IsSexualAbuseCase;
        resident.SubCatOsaec = request.SubCatOsaec;
        resident.SubCatCicl = request.SubCatCicl;
        resident.SubCatAtRisk = request.SubCatAtRisk;
        resident.SubCatStreetChild = request.SubCatStreetChild;
        resident.SubCatChildWithHiv = request.SubCatChildWithHiv;
        resident.IsPwd = request.IsPwd;
        resident.PwdType = request.PwdType;
        resident.HasSpecialNeeds = request.HasSpecialNeeds;
        resident.SpecialNeedsDiagnosis = request.SpecialNeedsDiagnosis;
        resident.FamilyIs4Ps = request.FamilyIs4Ps;
        resident.FamilySoloParent = request.FamilySoloParent;
        resident.FamilyIndigenous = request.FamilyIndigenous;
        resident.FamilyParentPwd = request.FamilyParentPwd;
        resident.FamilyInformalSettler = request.FamilyInformalSettler;
        resident.DateOfAdmission = request.DateOfAdmission;
        resident.ReferralSource = request.ReferralSource;
        resident.ReferringAgencyPerson = request.ReferringAgencyPerson;
        resident.DateColbRegistered = request.DateColbRegistered;
        resident.DateColbObtained = request.DateColbObtained;
        resident.AssignedSocialWorker = request.AssignedSocialWorker;
        resident.InitialCaseAssessment = request.InitialCaseAssessment;
        resident.DateCaseStudyPrepared = request.DateCaseStudyPrepared;
        resident.ReintegrationType = request.ReintegrationType;
        resident.ReintegrationStatus = request.ReintegrationStatus;
        resident.InitialRiskLevel = request.InitialRiskLevel;
        resident.CurrentRiskLevel = request.CurrentRiskLevel;
        resident.DateEnrolled = request.DateEnrolled;
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

    private async Task<ActionResult?> ValidateResidentRequestAsync(ResidentRequest request, int? residentId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var normalizedCaseControlNumber = request.CaseControlNumber.Trim().ToUpperInvariant();
        var normalizedInternalCode = request.InternalCode.Trim().ToUpperInvariant();

        if (request.DateOfBirth == default)
        {
            ModelState.AddModelError(nameof(request.DateOfBirth), "Date of birth is required.");
        }
        else if (request.DateOfBirth > today)
        {
            ModelState.AddModelError(nameof(request.DateOfBirth), "Date of birth cannot be in the future.");
        }

        if (request.DateOfAdmission == default)
        {
            ModelState.AddModelError(nameof(request.DateOfAdmission), "Date of admission is required.");
        }
        else if (request.DateOfBirth != default && request.DateOfAdmission < request.DateOfBirth)
        {
            ModelState.AddModelError(nameof(request.DateOfAdmission), "Date of admission cannot be earlier than date of birth.");
        }

        if (request.IsPwd && string.IsNullOrWhiteSpace(request.PwdType))
        {
            ModelState.AddModelError(nameof(request.PwdType), "PWD type is required when the resident is marked as PWD.");
        }

        if (request.HasSpecialNeeds && string.IsNullOrWhiteSpace(request.SpecialNeedsDiagnosis))
        {
            ModelState.AddModelError(
                nameof(request.SpecialNeedsDiagnosis),
                "Special needs diagnosis is required when special needs is enabled.");
        }

        if (request.DateColbRegistered.HasValue &&
            request.DateColbObtained.HasValue &&
            request.DateColbObtained < request.DateColbRegistered)
        {
            ModelState.AddModelError(
                nameof(request.DateColbObtained),
                "Date COLB obtained cannot be earlier than date COLB registered.");
        }

        if (request.DateCaseStudyPrepared.HasValue &&
            request.DateOfAdmission != default &&
            request.DateCaseStudyPrepared < request.DateOfAdmission)
        {
            ModelState.AddModelError(
                nameof(request.DateCaseStudyPrepared),
                "Case study preparation date cannot be earlier than date of admission.");
        }

        if (request.DateEnrolled.HasValue &&
            request.DateOfAdmission != default &&
            request.DateEnrolled < request.DateOfAdmission)
        {
            ModelState.AddModelError(
                nameof(request.DateEnrolled),
                "Enrollment date cannot be earlier than date of admission.");
        }

        if (request.DateClosed.HasValue &&
            request.DateOfAdmission != default &&
            request.DateClosed < request.DateOfAdmission)
        {
            ModelState.AddModelError(
                nameof(request.DateClosed),
                "Date closed cannot be earlier than date of admission.");
        }

        if (await dbContext.Residents.AsNoTracking().AnyAsync(x =>
                x.Id != residentId &&
                x.CaseControlNumber.ToUpper() == normalizedCaseControlNumber))
        {
            ModelState.AddModelError(
                nameof(request.CaseControlNumber),
                "Case control number already exists. Refresh the form to get the next available value.");
        }

        if (await dbContext.Residents.AsNoTracking().AnyAsync(x =>
                x.Id != residentId &&
                x.InternalCode.ToUpper() == normalizedInternalCode))
        {
            ModelState.AddModelError(
                nameof(request.InternalCode),
                "Internal code already exists. Refresh the form to get the next available value.");
        }

        if (ModelState.IsValid)
        {
            return null;
        }

        var errors = ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .SelectMany(entry => entry.Value!.Errors.Select(error => new
            {
                field = entry.Key,
                message = string.IsNullOrWhiteSpace(error.ErrorMessage) ? "Invalid value." : error.ErrorMessage
            }))
            .ToList();

        return BadRequest(new
        {
            title = "Validation failed",
            message = "One or more input fields are invalid.",
            status = StatusCodes.Status400BadRequest,
            traceId = HttpContext.TraceIdentifier,
            errors
        });
    }

    private static ResidentResponse MapResidentResponse(Resident resident) =>
        new(
            resident.Id,
            resident.CaseControlNumber,
            resident.InternalCode,
            resident.SafehouseId,
            resident.Safehouse?.Name ?? "Unknown safehouse",
            resident.CaseStatus,
            resident.Sex,
            resident.DateOfBirth,
            resident.BirthStatus,
            resident.PlaceOfBirth,
            resident.Religion,
            resident.CaseCategory,
            resident.SubCatOrphaned,
            resident.IsTrafficked,
            resident.SubCatChildLabor,
            resident.IsPhysicalAbuseCase,
            resident.IsSexualAbuseCase,
            resident.SubCatOsaec,
            resident.SubCatCicl,
            resident.SubCatAtRisk,
            resident.SubCatStreetChild,
            resident.SubCatChildWithHiv,
            resident.IsPwd,
            resident.PwdType,
            resident.HasSpecialNeeds,
            resident.SpecialNeedsDiagnosis,
            resident.FamilyIs4Ps,
            resident.FamilySoloParent,
            resident.FamilyIndigenous,
            resident.FamilyParentPwd,
            resident.FamilyInformalSettler,
            resident.DateOfAdmission,
            resident.ReferralSource,
            resident.ReferringAgencyPerson,
            resident.DateColbRegistered,
            resident.DateColbObtained,
            resident.AssignedSocialWorker,
            resident.InitialCaseAssessment,
            resident.DateCaseStudyPrepared,
            resident.ReintegrationType,
            resident.ReintegrationStatus,
            resident.InitialRiskLevel,
            resident.CurrentRiskLevel,
            resident.DateEnrolled,
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
