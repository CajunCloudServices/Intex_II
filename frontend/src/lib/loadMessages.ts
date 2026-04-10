import { getErrorMessage } from './apiErrors';

export function getRequestErrorMessage(reason: unknown, fallback: string) {
  return getErrorMessage(reason, fallback);
}

export function describeUnavailableSection(section: string, reason: unknown, fallback: string) {
  return `${section}: ${getRequestErrorMessage(reason, fallback)}`;
}

export function combineUnavailableSections(messages: string[]) {
  // Keep partial-load warnings compact so pages can surface multiple unavailable modules without a wall of alerts.
  return messages.length > 0
    ? `Some data is unavailable right now. ${messages.join(' ')}`
    : null;
}
