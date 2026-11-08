import type { User } from "oidc-client-ts";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthContext, type AuthState } from "./context";
import type { AuthClient, SignInState } from "./userManager";

/** sessionStorage key holding the epoch ms of the last automatic sign-in after a 401; never a token. */
export const reauthKey = "arch.reauth.at";
/** At most one automatic sign-in after a 401 per this window. */
export const reauthWindowMs = 60_000;

function recentReauth(): boolean {
  const raw = sessionStorage.getItem(reauthKey);
  const at = raw === null ? NaN : Number(raw);
  return Number.isFinite(at) && Date.now() - at < reauthWindowMs;
}

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionRejected, setSessionRejected] = useState(false);
  const userRef = useRef<User | null>(null);

  const setUser = useCallback((u: User | null) => {
    userRef.current = u;
    setUserState(u);
  }, []);

  const reauthenticate = useCallback(async () => {
    await client.removeUser();
    setUser(null);
  }, [client, setUser]);

  const signIn = useCallback(
    (returnTo: string) => client.signinRedirect({ state: { returnTo } satisfies SignInState }),
    [client],
  );

  const apiUnauthorized = useCallback(() => {
    if (!userRef.current) return;
    if (recentReauth()) {
      setSessionRejected(true);
      return;
    }
    sessionStorage.setItem(reauthKey, String(Date.now()));
    // Drop the user at once so the other 401s of this page are ignored while the redirect starts.
    setUser(null);
    void reauthenticate();
  }, [reauthenticate, setUser]);

  const signInAgain = useCallback(
    async (returnTo: string) => {
      sessionStorage.setItem(reauthKey, String(Date.now()));
      await client.removeUser();
      setSessionRejected(false);
      setUser(null);
      await signIn(returnTo);
    },
    [client, setUser, signIn],
  );

  useEffect(() => {
    let active = true;
    client
      .getUser()
      .then((u) => {
        if (active && u && !u.expired) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });

    const onLoaded = (u: User) => setUser(u);
    const onRenewError = () => void reauthenticate();
    client.events.addUserLoaded(onLoaded);
    client.events.addSilentRenewError(onRenewError);
    return () => {
      active = false;
      client.events.removeUserLoaded(onLoaded);
      client.events.removeSilentRenewError(onRenewError);
    };
  }, [client, reauthenticate, setUser]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      signingOut,
      sessionRejected,
      signIn,
      completeSignIn: async () => {
        const u = await client.signinRedirectCallback();
        setUser(u);
        return (u.state as SignInState | undefined)?.returnTo;
      },
      signOut: async () => {
        const idToken = userRef.current?.id_token;
        setSigningOut(true);
        try {
          await client.removeUser();
          setUser(null);
          await client.signoutRedirect({ id_token_hint: idToken });
        } catch {
          setSigningOut(false);
        }
      },
      reauthenticate,
      apiUnauthorized,
      signInAgain,
      accessToken: () => userRef.current?.access_token,
    }),
    [client, user, ready, signingOut, sessionRejected, signIn, reauthenticate, apiUnauthorized, signInAgain, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
