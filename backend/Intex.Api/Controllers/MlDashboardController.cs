using Intex.Api.Authorization;
using Intex.Api.Models.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Intex.Api.Controllers;

/// <summary>
/// Serves ML pipeline dashboard JSON only to authenticated staff/admin (not from public static files).
/// </summary>
[ApiController]
[Route("api/ml-dashboard")]
[Authorize(Policy = Policies.StaffOrAdmin)]
[EnableRateLimiting("reports-heavy")]
public class MlDashboardController(IWebHostEnvironment environment, IOptions<MlDashboardOptions> options) : ControllerBase
{
    private static readonly HashSet<string> AllowedFileKeys =
    [
        "counseling-dashboard-data",
        "donor-dashboard-data",
        "reintegration-dashboard-data",
        "social-dashboard-data",
        "social-content-mix-dashboard-data",
        "campaign-timing-dashboard-data",
        "safehouse-load-dashboard-data",
        "intervention-mix-dashboard-data",
        "incident-archetypes-dashboard-data",
        "resident-trajectory-dashboard-data",
    ];

    [HttpGet("data/{fileKey}")]
    public async Task<IActionResult> GetDashboardData([FromRoute] string fileKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(fileKey) || !AllowedFileKeys.Contains(fileKey))
        {
            return BadRequest(new { message = "Unknown dashboard data key." });
        }

        var baseDir = options.Value.DataDirectory;
        var dataDir = string.IsNullOrWhiteSpace(baseDir)
            ? Path.Combine(environment.ContentRootPath, "Data", "ml-dashboards")
            : Path.IsPathRooted(baseDir)
                ? baseDir
                : Path.Combine(environment.ContentRootPath, baseDir);

        var path = Path.Combine(dataDir, $"{fileKey}.json");
        path = Path.GetFullPath(path);
        dataDir = Path.GetFullPath(dataDir);
        if (!path.StartsWith(dataDir, StringComparison.Ordinal))
        {
            return BadRequest();
        }

        if (!System.IO.File.Exists(path))
        {
            return NotFound(new { message = "Dashboard data file is not deployed. Run the ML pipeline generators and copy JSON into Data/ml-dashboards." });
        }

        var json = await System.IO.File.ReadAllTextAsync(path, cancellationToken);
        return Content(json, "application/json");
    }
}
