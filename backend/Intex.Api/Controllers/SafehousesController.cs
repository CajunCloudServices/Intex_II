using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.StaffOrAdmin)]
public class SafehousesController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SafehouseResponse>>> GetAll([FromQuery] string? status)
    {
        var query = QuerySafehouses();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x => x.Status == status);
        }

        var safehouses = await query.OrderBy(x => x.Code).ToListAsync();
        return Ok(safehouses.Select(MapSafehouse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SafehouseResponse>> GetById(int id)
    {
        var safehouse = await QuerySafehouses().FirstOrDefaultAsync(x => x.Id == id);
        return safehouse is null ? NotFound() : Ok(MapSafehouse(safehouse));
    }

    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<SafehouseResponse>> Create(SafehouseRequest request)
    {
        var safehouse = new Safehouse
        {
            Code = request.Code,
            Name = request.Name,
            Region = request.Region,
            City = request.City,
            Province = request.Province,
            Country = request.Country,
            OpenDate = request.OpenDate,
            Status = request.Status,
            CapacityGirls = request.CapacityGirls,
            CapacityStaff = request.CapacityStaff,
            CurrentOccupancy = request.CurrentOccupancy,
            Notes = request.Notes
        };

        dbContext.Safehouses.Add(safehouse);
        await dbContext.SaveChangesAsync();

        var createdSafehouse = await QuerySafehouses().FirstAsync(x => x.Id == safehouse.Id);
        return CreatedAtAction(nameof(GetById), new { id = safehouse.Id }, MapSafehouse(createdSafehouse));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<SafehouseResponse>> Update(int id, SafehouseRequest request)
    {
        var safehouse = await dbContext.Safehouses.FindAsync(id);
        if (safehouse is null)
        {
            return NotFound();
        }

        safehouse.Code = request.Code;
        safehouse.Name = request.Name;
        safehouse.Region = request.Region;
        safehouse.City = request.City;
        safehouse.Province = request.Province;
        safehouse.Country = request.Country;
        safehouse.OpenDate = request.OpenDate;
        safehouse.Status = request.Status;
        safehouse.CapacityGirls = request.CapacityGirls;
        safehouse.CapacityStaff = request.CapacityStaff;
        safehouse.CurrentOccupancy = request.CurrentOccupancy;
        safehouse.Notes = request.Notes;

        await dbContext.SaveChangesAsync();
        var updatedSafehouse = await QuerySafehouses().FirstAsync(x => x.Id == id);
        return Ok(MapSafehouse(updatedSafehouse));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Delete requires confirm=true." });
        }

        var safehouse = await dbContext.Safehouses.FindAsync(id);
        if (safehouse is null)
        {
            return NotFound();
        }

        dbContext.Safehouses.Remove(safehouse);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Safehouse> QuerySafehouses() =>
        dbContext.Safehouses
            .Include(safehouse => safehouse.Residents)
            .Include(safehouse => safehouse.IncidentReports);

    private static SafehouseResponse MapSafehouse(Safehouse safehouse) =>
        new(
            safehouse.Id,
            safehouse.Code,
            safehouse.Name,
            safehouse.Region,
            safehouse.City,
            safehouse.Province,
            safehouse.Country,
            safehouse.OpenDate,
            safehouse.Status,
            safehouse.CapacityGirls,
            safehouse.CapacityStaff,
            safehouse.CurrentOccupancy,
            safehouse.Notes,
            safehouse.Residents.Count,
            safehouse.IncidentReports.Count);
}
