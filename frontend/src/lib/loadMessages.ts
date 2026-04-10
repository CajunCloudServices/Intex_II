export function getRequestErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export function describeUnavailableSection(section: string, reason: unknown, fallback: string) {
  return `${section}: ${getRequestErrorMessage(reason, fallback)}`;
}

export function combineUnavailableSections(messages: string[]) {
  return messages.length > 0
    ? `Some data is unavailable right now. ${messages.join(' ')}`
    : null;
}
