import { type ReactNode, useState } from "react";

import { useAuth } from "../auth/context";
import { ApiContext, createApiClient } from "./client";

export function ApiProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  // apiUnauthorized is a stable callback, so the client created once always calls the current one.
  const { accessToken, apiUnauthorized } = useAuth();
  const [api] = useState(() =>
    createApiClient({ baseUrl, accessToken, onUnauthorized: () => apiUnauthorized() }),
  );
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
