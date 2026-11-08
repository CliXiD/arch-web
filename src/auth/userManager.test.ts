import { type INavigator, UserManager } from "oidc-client-ts";
import { describe, expect, it, vi } from "vitest";

import { testConfig } from "../test/fakeAuth";
import { userManagerSettings } from "./userManager";

const origin = "http://localhost:5173";
const authority = testConfig.oidcAuthority;
const tokens = {
  access: "access-token-value-0123456789",
  refresh: "refresh-token-value-0123456789",
};

function b64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const now = Math.floor(Date.now() / 1000);
const idToken = [
  b64url({ alg: "RS256", typ: "JWT" }),
  b64url({ iss: authority, aud: "arch-web", sub: "user-sub", iat: now, exp: now + 300, name: "Editor Local" }),
  "signature",
].join(".");

/** Stubs discovery and the token endpoint of the realm. */
function stubRealm() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === `${authority}/.well-known/openid-configuration`) {
      return Response.json({
        issuer: authority,
        authorization_endpoint: `${authority}/protocol/openid-connect/auth`,
        token_endpoint: `${authority}/protocol/openid-connect/token`,
        end_session_endpoint: `${authority}/protocol/openid-connect/logout`,
        jwks_uri: `${authority}/protocol/openid-connect/certs`,
      });
    }
    if (url === `${authority}/protocol/openid-connect/token`) {
      return Response.json({
        access_token: tokens.access,
        refresh_token: tokens.refresh,
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 300,
        scope: "openid profile email",
      });
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A redirect navigator that records the URL instead of leaving the page. */
function recordingNavigator() {
  const urls: string[] = [];
  const navigator: INavigator = {
    prepare: async () => ({
      navigate: async ({ url }) => {
        urls.push(url);
        return { url };
      },
      close: () => {},
    }),
    callback: async () => {},
  };
  return { navigator, urls };
}

describe("UserManager settings", () => {
  it("uses Authorization Code + PKCE with the callback and post-logout URIs", () => {
    const s = userManagerSettings(testConfig, origin);
    expect(s).toMatchObject({
      authority,
      client_id: "arch-web",
      response_type: "code",
      scope: "openid profile email",
      redirect_uri: "http://localhost:5173/auth/callback",
      post_logout_redirect_uri: "http://localhost:5173/",
      automaticSilentRenew: true,
    });
  });

  it("keeps tokens in memory only: nothing in localStorage, no token in sessionStorage", async () => {
    stubRealm();
    const { navigator, urls } = recordingNavigator();
    const um = new UserManager(userManagerSettings(testConfig, origin), navigator);

    await um.signinRedirect({ state: { returnTo: "/some/route" } });
    const authorize = new URL(urls[0]!);
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorize.searchParams.get("code_challenge")).toBeTruthy();
    const state = authorize.searchParams.get("state")!;

    const user = await um.signinRedirectCallback(`${origin}/auth/callback?code=the-code&state=${state}`);
    expect(user.access_token).toBe(tokens.access);
    expect(user.state).toEqual({ returnTo: "/some/route" });
    expect((await um.getUser())?.access_token).toBe(tokens.access);

    expect(localStorage.length).toBe(0);
    const session = Object.keys(sessionStorage).map((k) => `${k}=${sessionStorage.getItem(k)}`).join("\n");
    for (const token of [tokens.access, tokens.refresh, idToken]) {
      expect(session).not.toContain(token);
    }

    um.stopSilentRenew();
  });
});
