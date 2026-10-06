# @core/site — rules for AI agents

## Purpose
What every site has: settings (name, logo, contact, social profiles, legal page paths) as a @core/content singleton,
editable menus up to 3 levels as a content collection (slug = location: `header`, `footer`), and redirects managed
from the admin with loop detection, safe targets (site paths or https to allowed hosts) and hit counters.
No page content, no SEO tags (@core/seo reads these settings).

## Map
- `index.ts` — public API: `getSiteSettings`, `getMenu`, `upsertRedirect`, `resolveRedirect`, `redirectResponse`, `siteAdminResources`.
- `content.ts` — `siteSettings`, `menus` and their schemas. `redirects.ts` — redirect logic. `links.ts` — link validation.
- `adapters/hono.ts` — `redirectMiddleware`. `adapters/next.ts` — `redirectFor(req)`.

## Integration
1. Env: `SITE_URL` (`https://example.com`), optional `SITE_REDIRECT_HOSTS` (comma-separated external hosts allowed as redirect targets). Migrations as in `src/lib/db/AGENTS.md`.
2. Import this module once at startup (it registers the `site_settings` and `menus` content definitions).
3. Seed initial values with `seedEntry` (@core/content): settings and the `header`/`footer` menus, using the site's current ones.
4. Render: `const settings = await getSiteSettings({ locale })`, `const items = await getMenu('header', { locale })`.
5. Redirects: Hono `app.use(redirectMiddleware)`; Next.js `middleware.ts` with `runtime: 'nodejs'` calling `redirectFor(req)`.
6. Add `...siteAdminResources()` to `src/genpm/admin.ts`.
7. Verify: create a redirect `/old → /new` and request `/old` (301 to `/new`).

## Conventions
- Menu links are site paths, `https://`, `mailto:` or `tel:`; open external links with `rel="noopener"`.
- Redirect sources are exact paths without query; the incoming query string is preserved.
- Permissions: `site_settings:*`, `menus:*`, `redirects:read|create|update|delete`.

## Don't
- Don't hardcode the site name, logo or menus in components once this module is installed.
- Don't build redirects from user input; only from the admin through `upsertRedirect`.
- Don't put legal text here; only the paths of the legal pages.
