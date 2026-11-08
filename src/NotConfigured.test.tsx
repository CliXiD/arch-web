import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { NotConfigured } from "./App";

it("explains which config keys are missing", () => {
  render(<NotConfigured missing={["apiBaseUrl", "oidcAuthority"]} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Architecture E2E is not configured: missing apiBaseUrl, oidcAuthority",
  );
});
