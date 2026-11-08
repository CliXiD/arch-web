// Runtime configuration: GET /config.json (one image serves every environment), falling back key
// by key to the build-time VITE_* variables. [SPEC-operations-06]

export type AppConfig = {
  /** API origin, without a path: the client calls `${apiBaseUrl}/api/v1/...`. */
  apiBaseUrl: string;
  oidcAuthority: string;
  oidcClientId: string;
};

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; missing: (keyof AppConfig)[] };

type Env = Pick<ImportMetaEnv, "VITE_API_BASE_URL" | "VITE_OIDC_AUTHORITY" | "VITE_OIDC_CLIENT_ID">;

const fallbacks: Record<keyof AppConfig, keyof Env> = {
  apiBaseUrl: "VITE_API_BASE_URL",
  oidcAuthority: "VITE_OIDC_AUTHORITY",
  oidcClientId: "VITE_OIDC_CLIENT_ID",
};

async function fetchRuntimeConfig(fetchFn: typeof fetch): Promise<Record<string, unknown>> {
  try {
    const res = await fetchFn("/config.json", { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    // Vite dev answers unknown paths with index.html, so a 200 may not be JSON.
    const body: unknown = JSON.parse(await res.text());
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function loadConfig(fetchFn: typeof fetch = fetch, env: Env = import.meta.env): Promise<ConfigResult> {
  const runtime = await fetchRuntimeConfig(fetchFn);
  const config: Partial<AppConfig> = {};
  const missing: (keyof AppConfig)[] = [];
  for (const key of Object.keys(fallbacks) as (keyof AppConfig)[]) {
    const fromRuntime = runtime[key];
    const value = typeof fromRuntime === "string" && fromRuntime !== "" ? fromRuntime : env[fallbacks[key]];
    if (value) config[key] = value;
    else missing.push(key);
  }
  return missing.length === 0 ? { ok: true, config: config as AppConfig } : { ok: false, missing };
}
