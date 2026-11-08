import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { editorMe, fakeAuthClient, stubMe, testConfig, testUser } from "./test/fakeAuth";

function renderAt(path: string, auth: ReturnType<typeof fakeAuthClient>) {
  window.history.replaceState(null, "", path);
  return render(<App config={testConfig} authClient={auth.client} />);
}

describe("sign-in", () => {
  it("shows Signing in… while redirecting, with the current route as returnTo", async () => {
    const auth = fakeAuthClient();
    renderAt("/some/route?view=list#top", auth);

    expect(await screen.findByRole("status")).toHaveTextContent("Signing in…");
    await waitFor(() =>
      expect(auth.client.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: "/some/route?view=list#top" } }),
    );
    expect(auth.client.signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("shows Sign-in is unavailable when discovery fails, and Try again retries", async () => {
    const auth = fakeAuthClient();
    auth.client.signinRedirect.mockRejectedValueOnce(new Error("Failed to fetch metadata"));
    renderAt("/some/route", auth);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign-in is unavailable, try again");

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(auth.client.signinRedirect).toHaveBeenCalledTimes(2));
    expect(auth.client.signinRedirect).toHaveBeenLastCalledWith({ state: { returnTo: "/some/route" } });
    expect(await screen.findByRole("status")).toHaveTextContent("Signing in…");
  });

  it("completes the callback and navigates to returnTo", async () => {
    stubMe(200, editorMe);
    const auth = fakeAuthClient();
    auth.client.signinRedirectCallback.mockResolvedValueOnce(testUser({ returnTo: "/some/route?view=list" }));
    renderAt("/auth/callback?code=abc&state=xyz", auth);

    expect(await screen.findByRole("heading", { name: "Architecture E2E" })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe("/some/route?view=list");
    expect(auth.client.signinRedirect).not.toHaveBeenCalled();
  });

  it("shows Sign-in is unavailable when the callback fails", async () => {
    const auth = fakeAuthClient();
    auth.client.signinRedirectCallback.mockRejectedValueOnce(new Error("No matching state found in storage"));
    renderAt("/auth/callback?code=abc&state=stale", auth);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in is unavailable, try again");
  });
});

describe("shell", () => {
  it("shows Loading… in place of the menu while /me loads", async () => {
    let respond: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))));
    renderAt("/", fakeAuthClient(testUser()));

    const banner = await screen.findByRole("banner");
    expect(within(banner).getByRole("status")).toHaveTextContent("Loading…");

    respond(new Response(JSON.stringify(editorMe), { headers: { "Content-Type": "application/json" } }));
    expect(await within(banner).findByRole("button", { name: "Editor Local" })).toBeInTheDocument();
    expect(within(banner).queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the user menu with name, roles and teams after /me", async () => {
    stubMe(200, editorMe);
    renderAt("/some/route", fakeAuthClient(testUser()));

    const banner = await screen.findByRole("banner");
    expect(within(banner).getByRole("heading", { name: "Architecture E2E" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("The landscape is coming soon.");

    const menu = await within(banner).findByRole("button", { name: "Editor Local" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Roles: viewer, editor")).not.toBeVisible();

    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(menu.getAttribute("aria-controls")!)!;
    expect(panel).toBeVisible();
    expect(within(panel).getByText("Roles: viewer, editor")).toBeVisible();
    expect(within(panel).getByText("Teams: platform")).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Sign out" })).toBeVisible();

    await userEvent.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveFocus();
  });

  it("shows Teams: none when the user has no team", async () => {
    stubMe(200, { ...editorMe, name: "Viewer Local", roles: ["viewer"], teams: [] });
    renderAt("/", fakeAuthClient(testUser()));

    await userEvent.click(await screen.findByRole("button", { name: "Viewer Local" }));
    expect(screen.getByText("Teams: none")).toBeVisible();
  });

  it("replaces the page with the no-access message on 403", async () => {
    stubMe(403, { type: "/problems/forbidden", title: "Forbidden", status: 403, detail: "requires role viewer" });
    const auth = fakeAuthClient(testUser());
    renderAt("/", auth);

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have access to Architecture E2E; ask an admin");
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(auth.client.signoutRedirect).toHaveBeenCalled());
  });

  it("shows Couldn't load your profile on other errors, and Try again refetches", async () => {
    const fetchMock = stubMe(500, { title: "Internal Server Error", status: 500 });
    renderAt("/", fakeAuthClient(testUser()));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your profile");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  it("shows Sign-in is unavailable on 503 auth-unavailable, and Try again refetches", async () => {
    const fetchMock = stubMe(503, {
      type: "/problems/auth-unavailable",
      title: "Service Unavailable",
      status: 503,
      detail: "signing keys are not available yet; try again",
    });
    renderAt("/", fakeAuthClient(testUser()));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign-in is unavailable, try again");
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [input] = fetchMock.mock.calls[1]!;
    expect(input instanceof Request ? input.url : String(input)).toBe("http://api.test/api/v1/me");
  });

  it("shows Couldn't load your profile on a 503 of another type", async () => {
    stubMe(503, { type: "about:blank", title: "Service Unavailable", status: 503 });
    renderAt("/", fakeAuthClient(testUser()));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your profile");
  });
});

const unauthorized = { type: "/problems/unauthenticated", title: "Unauthorized", status: 401 };

function expectNoTokenInSessionStorage() {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)!;
    const entry = key + "=" + sessionStorage.getItem(key);
    for (const token of ["test-access-token", "test-id-token", "test-refresh-token"]) {
      expect(entry).not.toContain(token);
    }
  }
}

describe("session", () => {
  it("signs in again with the current route when the silent renew fails", async () => {
    stubMe(200, editorMe);
    const auth = fakeAuthClient(testUser());
    renderAt("/some/route?view=list", auth);
    await screen.findByRole("button", { name: "Editor Local" });

    auth.emitSilentRenewError();

    await waitFor(() =>
      expect(auth.client.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: "/some/route?view=list" } }),
    );
    expect(auth.client.removeUser).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Signing in…");
  });

  it("signs in again once with the current route on a first 401, and records when", async () => {
    stubMe(401, unauthorized);
    const auth = fakeAuthClient(testUser());
    renderAt("/some/route", auth);

    await waitFor(() =>
      expect(auth.client.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: "/some/route" } }),
    );
    expect(auth.client.signinRedirect).toHaveBeenCalledTimes(1);
    expect(auth.client.removeUser).toHaveBeenCalled();
    expect(Date.now() - Number(sessionStorage.getItem("arch.reauth.at"))).toBeLessThan(5_000);
    expectNoTokenInSessionStorage();
  });

  it("shows the rejected state on a 401 within 60 s of the last sign-in, without redirecting", async () => {
    sessionStorage.setItem("arch.reauth.at", String(Date.now() - 10_000));
    stubMe(401, unauthorized);
    const auth = fakeAuthClient(testUser());
    renderAt("/some/route", auth);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your session was rejected by the API. Try signing in again.");
    expect(within(alert).getByRole("button", { name: "Sign in again" })).toBeVisible();
    expect(within(alert).getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(auth.client.signinRedirect).not.toHaveBeenCalled();

    await userEvent.click(within(alert).getByRole("button", { name: "Sign in again" }));
    await waitFor(() =>
      expect(auth.client.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: "/some/route" } }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Signing in…");
    expect(auth.client.signinRedirect).toHaveBeenCalledTimes(1);
    expect(Date.now() - Number(sessionStorage.getItem("arch.reauth.at"))).toBeLessThan(5_000);
    expectNoTokenInSessionStorage();
  });

  it("Sign out from the rejected state calls signoutRedirect", async () => {
    sessionStorage.setItem("arch.reauth.at", String(Date.now() - 10_000));
    stubMe(401, unauthorized);
    const auth = fakeAuthClient(testUser());
    renderAt("/", auth);

    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(auth.client.signoutRedirect).toHaveBeenCalledWith({ id_token_hint: "test-id-token" }));
    expect(auth.client.signinRedirect).not.toHaveBeenCalled();
    expectNoTokenInSessionStorage();
  });

  it("shows Sign-in is unavailable when Sign in again fails", async () => {
    sessionStorage.setItem("arch.reauth.at", String(Date.now() - 10_000));
    stubMe(401, unauthorized);
    const auth = fakeAuthClient(testUser());
    auth.client.signinRedirect.mockRejectedValueOnce(new Error("Failed to fetch metadata"));
    renderAt("/", auth);

    await userEvent.click(await screen.findByRole("button", { name: "Sign in again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in is unavailable, try again");
  });

  it("signs in again on a 401 when the last automatic sign-in is older than 60 s", async () => {
    sessionStorage.setItem("arch.reauth.at", String(Date.now() - 61_000));
    stubMe(401, unauthorized);
    const auth = fakeAuthClient(testUser());
    renderAt("/some/route", auth);

    await waitFor(() =>
      expect(auth.client.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: "/some/route" } }),
    );
    expect(screen.queryByText("Your session was rejected by the API. Try signing in again.")).not.toBeInTheDocument();
    expectNoTokenInSessionStorage();
  });

  it("Sign out calls signoutRedirect with the id token and removes the user", async () => {
    stubMe(200, editorMe);
    const auth = fakeAuthClient(testUser());
    renderAt("/", auth);

    await userEvent.click(await screen.findByRole("button", { name: "Editor Local" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(auth.client.signoutRedirect).toHaveBeenCalledWith({ id_token_hint: "test-id-token" }));
    expect(auth.client.removeUser).toHaveBeenCalled();
    expect(auth.client.signinRedirect).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Editor Local" })).not.toBeInTheDocument();
  });
});
