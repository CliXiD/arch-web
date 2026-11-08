import {
  InMemoryWebStorage,
  UserManager,
  type UserManagerEvents,
  type UserManagerSettings,
  WebStorageStateStore,
} from "oidc-client-ts";

import type { AppConfig } from "../config";

/** The part of UserManager the app uses, so tests can pass a fake. */
export type AuthClient = Pick<
  UserManager,
  "getUser" | "signinRedirect" | "signinRedirectCallback" | "signoutRedirect" | "removeUser"
> & {
  events: Pick<
    UserManagerEvents,
    "addUserLoaded" | "removeUserLoaded" | "addSilentRenewError" | "removeSilentRenewError"
  >;
};

/** The state carried through the sign-in redirect. */
export type SignInState = { returnTo?: string };

export const callbackPath = "/auth/callback";

/**
 * Authorization Code + PKCE against Keycloak. Tokens live in memory only: the user store never
 * touches Web Storage. The default state store keeps only the transient PKCE state in
 * sessionStorage across the redirect, and removes it on callback. [SPEC-identity-access-01]
 */
export function userManagerSettings(config: AppConfig, origin = window.location.origin): UserManagerSettings {
  return {
    authority: config.oidcAuthority,
    client_id: config.oidcClientId,
    redirect_uri: `${origin}${callbackPath}`,
    post_logout_redirect_uri: `${origin}/`,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  };
}

export function createUserManager(config: AppConfig): UserManager {
  return new UserManager(userManagerSettings(config));
}
