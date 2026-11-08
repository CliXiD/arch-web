import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App, NotConfigured } from "./App";
import { createUserManager } from "./auth/userManager";
import { loadConfig } from "./config";

const root = createRoot(document.getElementById("root")!);

void loadConfig().then((result) => {
  root.render(
    <StrictMode>
      {result.ok ? (
        <App config={result.config} authClient={createUserManager(result.config)} />
      ) : (
        <NotConfigured missing={result.missing} />
      )}
    </StrictMode>,
  );
});
