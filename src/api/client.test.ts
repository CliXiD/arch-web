import { describe, expect, it, vi } from "vitest";

import { createApiClient, newTraceparent } from "./client";

const traceparent = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

describe("API client", () => {
  it("sends Authorization: Bearer and a fresh traceparent on every call", async () => {
    const fetchMock = vi.fn<(req: Request) => Promise<Response>>(async () => Response.json({ subject: "s" }));
    const api = createApiClient({
      baseUrl: "http://api.test",
      accessToken: () => "the-access-token",
      onUnauthorized: vi.fn(),
      fetch: fetchMock as unknown as typeof fetch,
    });

    await api.GET("/api/v1/me");
    await api.GET("/api/v1/me");

    const [first, second] = fetchMock.mock.calls.map(([req]) => req);
    expect(first!.url).toBe("http://api.test/api/v1/me");
    expect(first!.headers.get("Authorization")).toBe("Bearer the-access-token");
    expect(first!.headers.get("traceparent")).toMatch(traceparent);
    expect(second!.headers.get("traceparent")).toMatch(traceparent);
    expect(second!.headers.get("traceparent")).not.toBe(first!.headers.get("traceparent"));
  });

  it("calls onUnauthorized on a 401", async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: "http://api.test",
      accessToken: () => "expired",
      onUnauthorized,
      fetch: (async () => Response.json({ status: 401 }, { status: 401 })) as unknown as typeof fetch,
    });

    await api.GET("/api/v1/me");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("generates valid traceparent values", () => {
    for (let i = 0; i < 50; i++) expect(newTraceparent()).toMatch(traceparent);
  });
});
