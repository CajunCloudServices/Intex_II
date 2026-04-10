using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record HomeVisitationRequest(
    [Range(1, int.MaxValue)] int ResidentId,
    DateOnly VisitDate,
    [Required, StringLength(120)] string SocialWorker,
    [Required, StringLength(50)] string VisitType,
    [Required, StringLength(250)] string LocationVisited,
    [Required, StringLength(200)] string FamilyMembersPresent,
    [StringLength(200)] string? Purpose,
    [StringLength(1000)] string? Observations,
    [Required, StringLength(40)] string FamilyCooperationLevel,
    bool SafetyConcernsNoted,
    [StringLength(2000)] string? SafetyConcernDetails,
    bool FollowUpNeeded,
    [StringLength(4000)] string? FollowUpNotes,
    [Required, StringLength(30)] string VisitOutcome);

public record HomeVisitationResponse(
    int Id,
    int ResidentId,
    string ResidentCode,
    DateOnly VisitDate,
    string SocialWorker,
    string VisitType,
    string LocationVisited,
    string FamilyMembersPresent,
    string? Purpose,
    string? Observations,
    string FamilyCooperationLevel,
    bool SafetyConcernsNoted,
    string? SafetyConcernDetails,
    bool FollowUpNeeded,
    string? FollowUpNotes,
    string VisitOutcome);
