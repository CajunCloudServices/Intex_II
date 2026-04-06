using System.ComponentModel.DataAnnotations;

namespace Intex.Api.DTOs;

public record ProcessRecordingRequest(
    [Range(1, int.MaxValue)] int ResidentId,
    DateOnly SessionDate,
    [Required, StringLength(120)] string SocialWorker,
    [Required, StringLength(30)] string SessionType,
    [Range(1, 480)] int SessionDurationMinutes,
    [Required, StringLength(30)] string EmotionalStateObserved,
    [Required, StringLength(30)] string EmotionalStateEnd,
    [Required, StringLength(4000)] string SessionNarrative,
    [Required, StringLength(4000)] string InterventionsApplied,
    [Required, StringLength(4000)] string FollowUpActions,
    bool ProgressNoted,
    bool ConcernsFlagged,
    bool ReferralMade,
    [StringLength(4000)] string? RestrictedNotes);

public record ProcessRecordingResponse(
    int Id,
    int ResidentId,
    string ResidentCode,
    DateOnly SessionDate,
    string SocialWorker,
    string SessionType,
    int SessionDurationMinutes,
    string EmotionalStateObserved,
    string EmotionalStateEnd,
    string SessionNarrative,
    string InterventionsApplied,
    string FollowUpActions,
    bool ProgressNoted,
    bool ConcernsFlagged,
    bool ReferralMade,
    string? RestrictedNotes);
