export function FeedbackBanner({
  tone,
  message,
}: {
  tone: 'success' | 'error' | 'info';
  message: string;
}) {
  const lines = message.split('\n');
  return (
    <div className={`feedback-banner feedback-${tone}`}>
      {lines.length === 1 ? (
        message
      ) : (
        <>
          {lines[0]}
          <ul className="feedback-banner-list">
            {lines.slice(1).map((line, i) => (
              <li key={i}>{line.replace(/^•\s*/, '')}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
