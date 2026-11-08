import { describe, expect, it, vi } from "vitest";

import { loadConfig } from "./config";

const env = {
  VITE_API_BASE_URL: "http://localhost:8080",
  VITE_OIDC_AUTHORITY: "http://localhost:8180/realms/arch",
  VITE_OIDC_CLIENT_ID: "arch-web",
};
const fromEnv = { apiBaseUrl: env.VITE_API_BASE_URL, oidcAuthority: env.VITE_OIDC_AUTHORITY, oidcClientId: env.VITE_OIDC_CLIENT_ID };

const respond = (body: string, init?: ResponseInit) =>
  vi.fn(async () => new Response(body, init)) as unknown as typeof fetch;

describe("loadConfig", () => {
  it("uses /config.json when it has every key", async () => {
    const runtime = { apiBaseUrl: "https://api.example", oidcAuthority: "https://sso.example/realms/arch", oidcClientId: "web" };
    const fetchMock = respond(JSON.stringify(runtime), { headers: { "Content-Type": "application/json" } });
    expect(await loadConfig(fetchMock, env)).toEqual({ ok: true, config: runtime });
    expect(fetchMock).toHaveBeenCalledWith("/config.json", expect.anything());
  });

  it("falls back to VITE_* when /config.json returns HTML", async () => {
    const html = respond("<!doctype html><html><body><div id=root></div></body></html>", {
      headers: { "Content-Type": "text/html" },
    });
    expect(await loadConfig(html, env)).toEqual({ ok: true, config: fromEnv });
  });

  it("falls back to VITE_* when /config.json is not ok", async () => {
    expect(await loadConfig(respond("missing", { status: 404 }), env)).toEqual({ ok: true, config: fromEnv });
  });

  it("falls back to VITE_* when the request fails", async () => {
    const failing = vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch;
    expect(await loadConfig(failing, env)).toEqual({ ok: true, config: fromEnv });
  });

  it("falls back key by key when /config.json lacks a key", async () => {
    const partial = respond(JSON.stringify({ apiBaseUrl: "https://api.example" }));
    expect(await loadConfig(partial, env)).toEqual({ ok: true, config: { ...fromEnv, apiBaseUrl: "https://api.example" } });
  });

  it("lists the missing keys when neither source has them", async () => {
    const partial = respond(JSON.stringify({ oidcClientId: "web" }));
    expect(await loadConfig(partial, {})).toEqual({ ok: false, missing: ["apiBaseUrl", "oidcAuthority"] });
  });
});
