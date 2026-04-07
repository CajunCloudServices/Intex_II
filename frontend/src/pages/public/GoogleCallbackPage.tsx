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
  const { completeGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const callbackParams = useMemo(() => new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash), [location.hash]);

  useEffect(() => {
    const token = callbackParams.get('token');
    const remoteError = callbackParams.get('error');
    const returnUrl = normalizeReturnUrl(callbackParams.get('returnUrl'));

    if (remoteError) {
      setError(remoteError);
      return;
    }

    if (!token) {
      setError('Google sign-in did not return a valid session token.');
      return;
    }

    const complete = async () => {
      try {
        const profile = await completeGoogleLogin(token);
        const defaultRoute = profile.roles.includes('Donor') && profile.roles.length === 1 ? '/portal/donor-history' : '/portal/admin';
        navigate(returnUrl === '/portal' ? defaultRoute : returnUrl, { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google sign-in could not be completed.');
      }
    };

    void complete();
  }, [callbackParams, completeGoogleLogin, navigate]);

  return (
    <div className="page-shell narrow">
      {error ? <ErrorState message={error} /> : <LoadingState label="Completing Google sign-in..." />}
    </div>
  );
}
