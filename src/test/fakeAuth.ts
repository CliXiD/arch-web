import { User } from "oidc-client-ts";
import { vi } from "vitest";

import type { AuthClient } from "../auth/userManager";

type Listener<T extends unknown[]> = (...args: T) => void;

/** A fake UserManager: every method is a vi.fn, and events can be emitted by the test. */
export function fakeAuthClient(initialUser: User | null = null) {
  const loaded = new Set<Listener<[User]>>();
  const renewErrors = new Set<Listener<[Error]>>();
  let current = initialUser;

  const client = {
    getUser: vi.fn(async () => current),
    signinRedirect: vi.fn(() => new Promise<void>(() => {})), // the browser leaves for Keycloak
    signinRedirectCallback: vi.fn(async () => {
      current = testUser({ returnTo: "/" });
      return current;
    }),
    signoutRedirect: vi.fn(() => new Promise<void>(() => {})),
    removeUser: vi.fn(async () => {
      current = null;
    }),
    events: {
      addUserLoaded: vi.fn((cb: Listener<[User]>) => {
        loaded.add(cb);
        return () => loaded.delete(cb);
      }),
      removeUserLoaded: vi.fn((cb: Listener<[User]>) => void loaded.delete(cb)),
      addSilentRenewError: vi.fn((cb: Listener<[Error]>) => {
        renewErrors.add(cb);
        return () => renewErrors.delete(cb);
      }),
      removeSilentRenewError: vi.fn((cb: Listener<[Error]>) => void renewErrors.delete(cb)),
    },
  };

  return {
    client: client as unknown as AuthClient & typeof client,
    emitSilentRenewError: () => renewErrors.forEach((cb) => cb(new Error("refresh failed"))),
  };
}

export function testUser(state?: unknown): User {
  return new User({
    access_token: "test-access-token",
    id_token: "test-id-token",
    refresh_token: "test-refresh-token",
    token_type: "Bearer",
    scope: "openid profile email",
    profile: { sub: "user-sub", iss: "http://localhost:8180/realms/arch", aud: "arch-web", exp: 0, iat: 0 },
    expires_at: Math.floor(Date.now() / 1000) + 300,
    userState: state,
  });
}

export const editorMe = {
  subject: "user-sub",
  name: "Editor Local",
  email: "editor@local",
  roles: ["viewer", "editor"],
  teams: ["platform"],
  actor_kind: "user",
};

export const testConfig = {
  apiBaseUrl: "http://api.test",
  oidcAuthority: "http://keycloak.test/realms/arch",
  oidcClientId: "arch-web",
};

/** Stubs fetch so GET /api/v1/me answers with status and body; returns the mock. */
export function stubMe(status: number, body: unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === `${testConfig.apiBaseUrl}/api/v1/me`) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
