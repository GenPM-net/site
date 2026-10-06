// @core/site — API pública. Importa desde aquí; middleware de redirecciones en adapters/.
export { redirectsAdminResource, siteAdminResources } from './admin.js';
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
} from './content.js';
export { allowedHosts, assertRedirectTarget, isSafeLink, normalizePath, SiteError } from './links.js';
export {
  deleteRedirect,
  invalidateRedirectCache,
  REDIRECT_STATUSES,
  type RedirectStatus,
  redirectResponse,
  resolveRedirect,
  upsertRedirect,
} from './redirects.js';
export { type Redirect, redirects } from './schema.js';
