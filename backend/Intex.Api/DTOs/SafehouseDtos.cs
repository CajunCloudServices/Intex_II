using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record SafehouseRequest(
    [Required, StringLength(20)] string Code,
    [Required, StringLength(150)] string Name,
    [Required, StringLength(40)] string Region,
    [Required, StringLength(80)] string City,
    [Required, StringLength(80)] string Province,
    [Required, StringLength(80)] string Country,
    DateOnly OpenDate,
    [Required, StringLength(20)] string Status,
    [Range(0, 1000)] int CapacityGirls,
    [Range(0, 1000)] int CapacityStaff,
    [Range(0, 1000)] int CurrentOccupancy,
    [StringLength(4000)] string? Notes);

public record SafehouseResponse(
    int Id,
    string Code,
    string Name,
    string Region,
    string City,
    string Province,
    string Country,
    DateOnly OpenDate,
    string Status,
    int CapacityGirls,
    int CapacityStaff,
    int CurrentOccupancy,
    string? Notes,
    int ResidentCount,
    int IncidentCount);
