import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { SignInUnavailable, StatusMessage } from "../components/StatusMessage";
import { useAuth } from "./context";

/** Renders children for a signed-in user; otherwise redirects to Keycloak, back to this route. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, signingOut, signIn } = useAuth();
  const location = useLocation();
  const returnTo = location.pathname + location.search + location.hash;
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  const started = useRef<number | null>(null);
  const needsSignIn = ready && !user && !signingOut;

  useEffect(() => {
    if (!needsSignIn) {
      started.current = null;
      return;
    }
    if (started.current === attempt) return;
    started.current = attempt;
    signIn(returnTo).catch(() => setFailedAttempt(attempt));
  }, [needsSignIn, attempt, returnTo, signIn]);

  if (user) return children;
  if (signingOut) return <StatusMessage>Signing out…</StatusMessage>;
  if (failedAttempt === attempt) return <SignInUnavailable onRetry={() => setAttempt((a) => a + 1)} />;
  return (
    <StatusMessage>
      <p>Signing in…</p>
    </StatusMessage>
  );
}
