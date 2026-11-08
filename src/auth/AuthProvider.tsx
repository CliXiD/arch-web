import type { User } from "oidc-client-ts";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthContext, type AuthState } from "./context";
import type { AuthClient, SignInState } from "./userManager";

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const userRef = useRef<User | null>(null);

  const setUser = useCallback((u: User | null) => {
    userRef.current = u;
    setUserState(u);
  }, []);

  const reauthenticate = useCallback(async () => {
    await client.removeUser();
    setUser(null);
  }, [client, setUser]);

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
      signIn: (returnTo) => client.signinRedirect({ state: { returnTo } satisfies SignInState }),
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
      accessToken: () => userRef.current?.access_token,
    }),
    [client, user, ready, signingOut, reauthenticate, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
