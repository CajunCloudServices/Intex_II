using System.Text.Json;
using Intex.Api.Data;
using Intex.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public-impact")]
[AllowAnonymous]
public class PublicImpactController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicImpactSnapshotResponse>>> GetPublished()
    {
        var snapshotEntities = await dbContext.PublicImpactSnapshots
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.SnapshotDate)
            .ToListAsync();

        var snapshots = snapshotEntities.Select(x => new PublicImpactSnapshotResponse(
            x.Id,
            x.SnapshotDate,
            x.Headline,
            x.SummaryText,
            JsonSerializer.Deserialize<List<PublicImpactMetricDto>>(x.MetricPayloadJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? []));

        return Ok(snapshots);
    }
}
