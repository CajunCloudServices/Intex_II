import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState, LoadingState } from '../../components/ui/PageState';

function normalizeReturnUrl(returnUrl: string | null) {
  if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
    return '/portal';
  }

  return returnUrl;
}

export function GoogleCallbackPage() {
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const callbackParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const remoteError = callbackParams.get('error');
  const returnUrl = normalizeReturnUrl(callbackParams.get('returnUrl'));

  useEffect(() => {
    if (remoteError) {
      return;
    }

    const complete = async () => {
      try {
        const profile = await refreshSession();
        const defaultRoute = profile.roles.includes('Donor') && profile.roles.length === 1 ? '/portal/my-impact' : '/portal/admin';
        navigate(returnUrl === '/portal' ? defaultRoute : returnUrl, { replace: true });
      } catch {
        setError('Google sign-in could not be completed.');
      }
    };

    void complete();
  }, [navigate, refreshSession, remoteError, returnUrl]);

  const message = remoteError ?? error;

  return (
    <div className="page-shell narrow">
      {message ? <ErrorState message={message} /> : <LoadingState label="Completing Google sign-in..." />}
    </div>
  );
}
