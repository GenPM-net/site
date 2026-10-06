// @core/site — API pública. Importa desde aquí; middleware de redirecciones en adapters/.
export { redirectsAdminResource, siteAdminResources } from './admin.ts';
export {
  getMenu,
  getSiteSettings,
  type MenuItem,
  MenuSchema,
  menus,
  type SiteSettings,
  SiteSettingsSchema,
  SocialPlatforms,
  siteSettings,
} from './content.ts';
export { allowedHosts, assertRedirectTarget, isSafeLink, normalizePath, SiteError } from './links.ts';
export {
  deleteRedirect,
  invalidateRedirectCache,
  REDIRECT_STATUSES,
  type RedirectStatus,
  redirectResponse,
  resolveRedirect,
  upsertRedirect,
} from './redirects.ts';
export { type Redirect, redirects } from './schema.ts';
