import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { SessionRejected, SignInUnavailable, StatusMessage } from "../components/StatusMessage";
import { useAuth } from "./context";

/**
 * Renders children for a signed-in user; otherwise redirects to Keycloak, back to this route. When
 * the API keeps rejecting the session it shows the rejected state instead of redirecting again.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, signingOut, sessionRejected, signIn, signInAgain, signOut } = useAuth();
  const location = useLocation();
  const returnTo = location.pathname + location.search + location.hash;
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  const started = useRef<number | null>(null);
  const needsSignIn = ready && !user && !signingOut && !sessionRejected;

  useEffect(() => {
    if (!needsSignIn) {
      started.current = null;
      return;
    }
    if (started.current === attempt) return;
    started.current = attempt;
    signIn(returnTo).catch(() => setFailedAttempt(attempt));
  }, [needsSignIn, attempt, returnTo, signIn]);

  const onSignInAgain = () => {
    started.current = attempt; // signInAgain redirects itself; the effect must not start another
    signInAgain(returnTo).catch(() => setFailedAttempt(attempt));
  };

  if (signingOut) return <StatusMessage>Signing out…</StatusMessage>;
  if (sessionRejected) return <SessionRejected onSignInAgain={onSignInAgain} onSignOut={() => void signOut()} />;
  if (user) return children;
  if (failedAttempt === attempt) return <SignInUnavailable onRetry={() => setAttempt((a) => a + 1)} />;
  return (
    <StatusMessage>
      <p>Signing in…</p>
    </StatusMessage>
  );
}
