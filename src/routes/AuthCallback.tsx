import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/context";
import { SignInUnavailable, StatusMessage } from "../components/StatusMessage";

/** /auth/callback: completes the Keycloak redirect, then returns to the route the user asked for. */
export function AuthCallback() {
  const { completeSignIn, signIn } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeSignIn()
      .then((returnTo) => navigate(returnTo ?? "/", { replace: true }))
      .catch(() => setFailed(true));
  }, [completeSignIn, navigate]);

  if (failed) {
    return (
      <SignInUnavailable
        onRetry={() => {
          setFailed(false);
          signIn("/").catch(() => setFailed(true));
        }}
      />
    );
  }
  return (
    <StatusMessage>
      <p>Signing in…</p>
    </StatusMessage>
  );
}
