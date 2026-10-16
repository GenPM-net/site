# @core/site

[![genpm](https://api.genpm.net/v1/badge/@core/site.svg)](https://genpm.net/p/@core/site) ![license](https://img.shields.io/badge/license-MIT-blue)

> Site settings, editable nested menus and managed redirects with loop and open-redirect protection

A [GenPM](https://genpm.net) module: **source code + AI rules + MCP config**, injected into your project instead of hidden in `node_modules`. The code lands in `src/lib/site`, pinned to a verified commit, and you own it.

## Install

```bash
genpm add @core/site
```

No genpm yet? `curl -fsSL https://genpm.net/install.sh | sh` (macOS/Linux), `irm https://genpm.net/install.ps1 | iex` (Windows), or one-off with `npx @genpm-net/cli add @core/site`.

Or let your AI agent do it: run `genpm mcp setup` once, then ask *"add @core/site with genpm"* in Claude Code, Cursor, VS Code, Windsurf, Codex or Gemini CLI. It shows you a dry-run plan before writing anything.

## What it does

What every site has: settings (name, logo, contact, social profiles, legal page paths) as a @core/content singleton,
editable menus up to 3 levels as a content collection (slug = location: `header`, `footer`), and redirects managed
from the admin with loop detection, safe targets (site paths or https to allowed hosts) and hit counters.
No page content, no SEO tags (@core/seo reads these settings).

## Setup

After `genpm add`, follow these steps (your AI agent finds the same steps in `src/lib/site/AGENTS.md` and can do them for you):

1. Env: `SITE_URL` (`https://example.com`), optional `SITE_REDIRECT_HOSTS` (comma-separated external hosts allowed as redirect targets). Migrations as in `src/lib/db/AGENTS.md`.
2. Import this module once at startup (it registers the `site_settings` and `menus` content definitions).
3. Seed initial values with `seedEntry` (@core/content): settings and the `header`/`footer` menus, using the site's current ones.
4. Render: `const settings = await getSiteSettings({ locale })`, `const items = await getMenu('header', { locale })`.
5. Redirects: Hono `app.use(redirectMiddleware)`; Next.js `middleware.ts` with `runtime: 'nodejs'` calling `redirectFor(req)`.
6. Add `...siteAdminResources()` to `src/genpm/admin.ts`.
7. Verify: create a redirect `/old → /new` and request `/old` (301 to `/new`).

## What's inside

Paths are relative to `src/lib/site`.

- `index.ts` — public API: `getSiteSettings`, `getMenu`, `upsertRedirect` (by `from`), `updateRedirect` (by id), `resolveRedirect`, `redirectResponse`, `siteAdminResources`.
- `content.ts` — `siteSettings`, `menus` and their schemas. `redirects.ts` — redirect logic. `links.ts` — link validation.
- `adapters/hono.ts` — `redirectMiddleware`. `adapters/next.ts` — `redirectFor(req)`.

## At a glance

- **GenPM dependencies** (installed with it): [@core/db](https://genpm.net/p/@core/db), [@core/content](https://genpm.net/p/@core/content), [@core/contracts](https://genpm.net/p/@core/contracts)
- **npm dependencies** (proposed, never installed without asking): `zod`
- **Environment variables** (added to `.env.example`): `SITE_URL`, `SITE_REDIRECT_HOSTS`
- **AI rules**: [`AGENTS.md`](AGENTS.md), loaded by your agent only when it works in `src/lib/site`

## Security

GenPM installs a 40-character commit SHA (never a branch), verifies an Ed25519-signed manifest, never runs install scripts and scans AI rules for prompt injection. Details: [genpm.net/docs/security](https://genpm.net/docs/security).

## License

MIT — see [LICENSE](LICENSE). Browse the full catalog at [genpm.net](https://genpm.net).
