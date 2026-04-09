export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="state-panel state-loading" aria-live="polite">
      <div className="state-spinner" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <p>The app is fetching data for this view.</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="state-panel state-empty">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-panel state-error" role="alert">
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button className="secondary-button" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SuccessState({
  title = 'Success',
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="state-panel state-success" role="status" aria-live="polite">
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
