export function FeedbackBanner({
  tone,
  message,
}: {
  tone: 'success' | 'error' | 'info';
  message: string;
}) {
  return <div className={`feedback-banner feedback-${tone}`}>{message}</div>;
}
