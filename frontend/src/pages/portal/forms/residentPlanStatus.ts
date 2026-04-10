export function normalizeResidentPlanStatusForForm(status?: string | null): string {
  const trimmed = status?.trim() ?? '';
  switch (trimmed) {
    case 'InProgress':
      return 'In Progress';
    case 'Deferred':
      return 'On Hold';
    default:
      return trimmed;
  }
}

export function normalizeResidentPlanStatusForApi(status?: string | null): string {
  const trimmed = status?.trim() ?? '';
  switch (trimmed) {
    case 'InProgress':
    case 'In Progress':
      return 'In Progress';
    case 'Deferred':
    case 'On Hold':
      return 'On Hold';
    default:
      return trimmed;
  }
}

export function formatResidentPlanStatus(status?: string | null): string {
  const normalized = normalizeResidentPlanStatusForForm(status);
  return normalized || 'Not set';
}
