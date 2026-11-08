import { useQuery } from "@tanstack/react-query";

import { useApi } from "./client";
import type { components } from "./schema";

export type Me = components["schemas"]["Me"];

/**
 * An API error carrying the HTTP status, e.g. 403 for a user without an arch role, and the RFC 9457
 * problem `type` when the body has one.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problemType?: string,
  ) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

/** True for the API's `503 /problems/auth-unavailable`: it could not load the realm's signing keys yet. */
export function isAuthUnavailable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503 && err.problemType === "/problems/auth-unavailable";
}

/** GET /api/v1/me: the caller's identity, roles and teams. [SPEC-identity-access-08] */
export function useMe() {
  const api = useApi();
  return useQuery({
    queryKey: ["me"],
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET("/api/v1/me", { signal });
      if (!data) throw new ApiError(response.status, typeof error?.type === "string" ? error.type : undefined);
      return data;
    },
    retry: false,
  });
}
