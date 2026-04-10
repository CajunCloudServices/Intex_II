using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record CaseConferenceRequest(
    [Range(1, int.MaxValue)] int ResidentId,
    DateOnly ConferenceDate,
    [Required, StringLength(120)] string LeadWorker,
    [StringLength(400)] string? Attendees,
    [StringLength(500)] string? Purpose,
    [StringLength(4000)] string? DecisionsMade,
    [StringLength(4000)] string? FollowUpActions,
    DateOnly? NextReviewDate,
    [Required, StringLength(40)] string Status);

public record CaseConferenceResponse(
    int Id,
    int ResidentId,
    string ResidentCode,
    DateOnly ConferenceDate,
    string LeadWorker,
    string Attendees,
    string Purpose,
    string DecisionsMade,
    string FollowUpActions,
    DateOnly? NextReviewDate,
    string Status);

public record UpcomingCaseConferenceDto(
    int Id,
    int ResidentId,
    string ResidentCode,
    DateOnly ConferenceDate,
    string LeadWorker,
    string Status);
