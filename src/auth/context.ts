import type { User } from "oidc-client-ts";
import { createContext, useContext } from "react";

export type AuthState = {
  /** The signed-in user, or null. */
  user: User | null;
  /** False until the initial user lookup has finished. */
  ready: boolean;
  /** True from "Sign out" until the browser leaves for Keycloak. */
  signingOut: boolean;
  signIn: (returnTo: string) => Promise<void>;
  /** Completes the redirect and returns the route to go back to. */
  completeSignIn: () => Promise<string | undefined>;
  signOut: () => Promise<void>;
  /** Drops the session after a failed refresh or a 401; the guard then signs in again. */
  reauthenticate: () => Promise<void>;
  accessToken: () => string | undefined;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
