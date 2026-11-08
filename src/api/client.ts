import createClient, { type Client } from "openapi-fetch";
import { createContext, useContext } from "react";

import type { paths } from "./schema";

export type ApiClient = Client<paths>;

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(size: number): string {
  const bytes = new Uint8Array(size);
  // All-zero IDs are invalid in W3C Trace Context.
  do crypto.getRandomValues(bytes);
  while (bytes.every((b) => b === 0));
  return hex(bytes);
}

/** A fresh W3C `traceparent`: version 00, random trace and span IDs, sampled. [SPEC-operations-04] */
export function newTraceparent(): string {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

type Options = {
  /** API origin; requests go to `${baseUrl}/api/v1/...`. */
  baseUrl: string;
  accessToken: () => string | undefined;
  /** Called on every 401, after which the user is sent back to sign in. */
  onUnauthorized: () => void;
  fetch?: typeof fetch;
};

export function createApiClient({ baseUrl, accessToken, onUnauthorized, fetch }: Options): ApiClient {
  const client = createClient<paths>({ baseUrl, fetch });
  client.use({
    onRequest({ request }) {
      const token = accessToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      request.headers.set("traceparent", newTraceparent());
      return request;
    },
    onResponse({ response }) {
      if (response.status === 401) onUnauthorized();
      return response;
    },
  });
  return client;
}

export const ApiContext = createContext<ApiClient | null>(null);

export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used inside <ApiProvider>");
  return api;
}
