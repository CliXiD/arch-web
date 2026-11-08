import { useQuery } from "@tanstack/react-query";

import { useApi } from "./client";
import type { components } from "./schema";

export type Me = components["schemas"]["Me"];

/** An API error carrying the HTTP status, e.g. 403 for a user without an arch role. */
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

/** GET /api/v1/me: the caller's identity, roles and teams. [SPEC-identity-access-08] */
export function useMe() {
  const api = useApi();
  return useQuery({
    queryKey: ["me"],
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET("/api/v1/me", { signal });
      if (!data) throw new ApiError(response.status);
      return data;
    },
    retry: false,
  });
}
