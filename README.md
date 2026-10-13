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

## At a glance

- **GenPM dependencies** (installed with it): [@core/db](https://genpm.net/p/@core/db), [@core/content](https://genpm.net/p/@core/content), [@core/contracts](https://genpm.net/p/@core/contracts)
- **npm dependencies** (proposed, never installed without asking): `zod`
- **Environment variables** (added to `.env.example`): `SITE_URL`, `SITE_REDIRECT_HOSTS`
- **AI rules**: [`AGENTS.md`](AGENTS.md), loaded by your agent only when it works in `src/lib/site`

## Security

GenPM installs a 40-character commit SHA (never a branch), verifies an Ed25519-signed manifest, never runs install scripts and scans AI rules for prompt injection. Details: [genpm.net/docs/security](https://genpm.net/docs/security).

## License

MIT — see [LICENSE](LICENSE). Browse the full catalog at [genpm.net](https://genpm.net).
