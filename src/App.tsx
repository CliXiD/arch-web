import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ApiProvider } from "./api/ApiProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { type AuthClient, callbackPath } from "./auth/userManager";
import { Shell } from "./components/Shell";
import type { AppConfig } from "./config";
import { AuthCallback } from "./routes/AuthCallback";

function createAppRouter() {
  return createBrowserRouter([
    { path: callbackPath, element: <AuthCallback /> },
    {
      path: "*",
      element: (
        <RequireAuth>
          <Shell />
        </RequireAuth>
      ),
    },
  ]);
}

export function App({ config, authClient }: { config: AppConfig; authClient: AuthClient }) {
  const [queryClient] = useState(() => new QueryClient());
  const [router] = useState(createAppRouter);
  return (
    <AuthProvider client={authClient}>
      <ApiProvider baseUrl={config.apiBaseUrl}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ApiProvider>
    </AuthProvider>
  );
}

export function NotConfigured({ missing }: { missing: string[] }) {
  return (
    <div role="alert" className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <p>Architecture E2E is not configured: missing {missing.join(", ")}</p>
    </div>
  );
}
