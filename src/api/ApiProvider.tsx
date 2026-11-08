import { type ReactNode, useState } from "react";

import { useAuth } from "../auth/context";
import { ApiContext, createApiClient } from "./client";

export function ApiProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  const { accessToken, reauthenticate } = useAuth();
  const [api] = useState(() =>
    createApiClient({ baseUrl, accessToken, onUnauthorized: () => void reauthenticate() }),
  );
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
