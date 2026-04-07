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
public class SupportersController(ApplicationDbContext dbContext, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupporterResponse>>> GetAll([FromQuery] string? search)
    {
        var query = dbContext.Supporters.Include(x => x.Donations).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(x =>
                x.DisplayName.ToLower().Contains(search.ToLower()) ||
                x.Email.ToLower().Contains(search.ToLower()));
        }

        var supporters = await query
            .OrderBy(x => x.DisplayName)
            .Select(x => new SupporterResponse(
                x.Id,
                x.SupporterType,
                x.DisplayName,
                x.OrganizationName,
                x.FirstName,
                x.LastName,
                x.RelationshipType,
                x.Region,
                x.Country,
                x.Email,
                x.Phone,
                x.Status,
                x.FirstDonationDate,
                x.AcquisitionChannel,
                x.CreatedAtUtc,
                x.Donations.Count,
                x.Donations.Sum(d => d.Amount ?? d.EstimatedValue)))
            .ToListAsync();

        return Ok(supporters);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SupporterResponse>> GetById(int id)
    {
        var supporter = await dbContext.Supporters
            .Include(x => x.Donations)
            .Where(x => x.Id == id)
            .Select(x => new SupporterResponse(
                x.Id,
                x.SupporterType,
                x.DisplayName,
                x.OrganizationName,
                x.FirstName,
                x.LastName,
                x.RelationshipType,
                x.Region,
                x.Country,
                x.Email,
                x.Phone,
                x.Status,
                x.FirstDonationDate,
                x.AcquisitionChannel,
                x.CreatedAtUtc,
                x.Donations.Count,
                x.Donations.Sum(d => d.Amount ?? d.EstimatedValue)))
            .FirstOrDefaultAsync();

        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<SupporterResponse>> Create(SupporterRequest request)
    {
        var entity = new Supporter
        {
            SupporterType = request.SupporterType,
            DisplayName = request.DisplayName,
            OrganizationName = request.OrganizationName,
            FirstName = request.FirstName,
            LastName = request.LastName,
            RelationshipType = request.RelationshipType,
            Region = request.Region,
            Country = request.Country,
            Email = request.Email,
            Phone = request.Phone,
            Status = request.Status,
            FirstDonationDate = request.FirstDonationDate,
            AcquisitionChannel = request.AcquisitionChannel,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Supporters.Add(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Create", nameof(Supporter), entity.Id, $"Created supporter {entity.DisplayName}.", User);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, await BuildResponse(entity.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<SupporterResponse>> Update(int id, SupporterRequest request)
    {
        var entity = await dbContext.Supporters.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.SupporterType = request.SupporterType;
        entity.DisplayName = request.DisplayName;
        entity.OrganizationName = request.OrganizationName;
        entity.FirstName = request.FirstName;
        entity.LastName = request.LastName;
        entity.RelationshipType = request.RelationshipType;
        entity.Region = request.Region;
        entity.Country = request.Country;
        entity.Email = request.Email;
        entity.Phone = request.Phone;
        entity.Status = request.Status;
        entity.FirstDonationDate = request.FirstDonationDate;
        entity.AcquisitionChannel = request.AcquisitionChannel;

        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Update", nameof(Supporter), entity.Id, $"Updated supporter {entity.DisplayName}.", User);
        return Ok(await BuildResponse(id));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var entity = await dbContext.Supporters.FindAsync(id);
        if (entity is null)
        {
            return NotFound();
        }

        var summary = $"Deleted supporter {entity.DisplayName}.";
        dbContext.Supporters.Remove(entity);
        await dbContext.SaveChangesAsync();
        await auditLogService.LogAsync("Delete", nameof(Supporter), id, summary, User);
        return NoContent();
    }

    private async Task<SupporterResponse> BuildResponse(int id) =>
        await dbContext.Supporters
            .Include(x => x.Donations)
            .Where(x => x.Id == id)
            .Select(x => new SupporterResponse(
                x.Id,
                x.SupporterType,
                x.DisplayName,
                x.OrganizationName,
                x.FirstName,
                x.LastName,
                x.RelationshipType,
                x.Region,
                x.Country,
                x.Email,
                x.Phone,
                x.Status,
                x.FirstDonationDate,
                x.AcquisitionChannel,
                x.CreatedAtUtc,
                x.Donations.Count,
                x.Donations.Sum(d => d.Amount ?? d.EstimatedValue)))
            .FirstAsync();
}
