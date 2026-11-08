# arch-web

The Architecture E2E web app: a React 19 SPA (Vite, TypeScript, Tailwind 4, React Router 7,
TanStack Query) that will show the landscape, app-focus and impact views, editors and admin.

This first slice is the walking skeleton: runtime config, Keycloak sign-in (Authorization Code +
PKCE, tokens in memory only, silent refresh), an app shell whose user menu comes from
`GET /api/v1/me`, and RP-initiated sign-out.

## Prerequisites

- Node 26 (`.nvmrc`; `nvm use` or `fnm use`) and pnpm 10 (`packageManager` in `package.json`).
- The hub's local dev stack (Keycloak with realm `arch`) and a running `arch-api`: see the hub's
  `AGENTS.md`, *Local services*.

## Run it

From the hub:

```bash
dev/bin/stack up                # Postgres and Keycloak
dev/bin/apply-env arch-web      # writes repos/arch-web/.env with dummy values
```

Start `arch-api` (see its README), then in this repo:

```bash
pnpm install
pnpm dev                        # http://localhost:5173
```

The realm's `arch-web` client accepts redirects to `http://localhost:5173/*` only, so sign-in
works on that port. Tokens are kept in memory, so a reload signs in again (Keycloak returns at
once while its session lives).

## Configuration

At start-up the app fetches `GET /config.json` from its own origin:

```json
{ "apiBaseUrl": "http://localhost:8080", "oidcAuthority": "http://localhost:8180/realms/arch", "oidcClientId": "arch-web" }
```

Any key it can't get (no file, an error, HTML, or the key missing) falls back to the build-time
variable: `VITE_API_BASE_URL`, `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID` (see `.env.example`).
In dev, Vite answers `/config.json` with `index.html`, so the `VITE_*` values apply. When neither
source has a key, the page says which ones are missing. `apiBaseUrl` is an origin without a path.

## API types

`src/api/schema.d.ts` is generated from `arch-api`'s `api/openapi.yaml`; never edit it by hand.

```bash
pnpm gen:api                    # reads ../arch-api/api/openapi.yaml
ARCH_API_OPENAPI=/path/to/openapi.yaml pnpm gen:api
```

The default path is the sibling repo, both in the hub's `repos/` and in a factory worktree.

## Checks

The same steps run in CI (`.github/workflows/ci.yml`) and in the hub's factory gate
(`factory/checks/arch-web.sh`):

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## Documents

In the hub's `docs/`: specs `specs/001_identity-access.md` and `specs/009_operations.md`; ADRs
`adr/0007` (frontend stack), `adr/0008` (Keycloak), `adr/0010` (CI), `adr/0011`
(observability, `traceparent`) and `adr/0013` (runtime versions).
