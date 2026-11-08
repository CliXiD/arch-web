import type { User } from "oidc-client-ts";
import { createContext, useContext } from "react";

export type AuthState = {
  /** The signed-in user, or null. */
  user: User | null;
  /** False until the initial user lookup has finished. */
  ready: boolean;
  /** True from "Sign out" until the browser leaves for Keycloak. */
  signingOut: boolean;
  /** True after a second API 401 within the re-sign-in window: the API keeps rejecting the session. */
  sessionRejected: boolean;
  signIn: (returnTo: string) => Promise<void>;
  /** Completes the redirect and returns the route to go back to. */
  completeSignIn: () => Promise<string | undefined>;
  signOut: () => Promise<void>;
  /** Drops the session after a failed silent refresh; the guard then signs in again. */
  reauthenticate: () => Promise<void>;
  /**
   * Handles an API 401. Ignored while no user is held (a redirect is under way). Signs in again
   * at most once per 60 s (timestamp in sessionStorage `arch.reauth.at`); a 401 within that window
   * sets `sessionRejected` instead.
   */
  apiUnauthorized: () => void;
  /** "Sign in again" from the rejected state: records the attempt and redirects to Keycloak. */
  signInAgain: (returnTo: string) => Promise<void>;
  accessToken: () => string | undefined;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
