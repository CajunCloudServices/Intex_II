using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record IncidentReportRequest(
    [Range(1, int.MaxValue)] int ResidentId,
    [Range(1, int.MaxValue)] int SafehouseId,
    DateOnly IncidentDate,
    [Required, StringLength(50)] string IncidentType,
    [Required, StringLength(20)] string Severity,
    [Required, StringLength(4000)] string Description,
    [Required, StringLength(2000)] string ResponseTaken,
    bool Resolved,
    DateOnly? ResolutionDate,
    [Required, StringLength(120)] string ReportedBy,
    bool FollowUpRequired);

public record IncidentReportResponse(
    int Id,
    int ResidentId,
    string ResidentCode,
    int SafehouseId,
    string SafehouseName,
    DateOnly IncidentDate,
    string IncidentType,
    string Severity,
    string Description,
    string ResponseTaken,
    bool Resolved,
    DateOnly? ResolutionDate,
    string ReportedBy,
    bool FollowUpRequired);
