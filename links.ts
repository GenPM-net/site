// Validación de enlaces y rutas: nada de `javascript:`, `//host` ni dominios no permitidos.

export class SiteError extends Error {
  constructor(
    readonly code: 'invalid_path' | 'invalid_link' | 'redirect_loop' | 'not_found' | 'forbidden',
    message: string = code,
  ) {
    super(message);
    this.name = 'SiteError';
  }
}

/** Ruta del sitio normalizada: empieza por `/`, sin `//`, sin query/hash, sin barra final (salvo `/`). */
export function normalizePath(path: string): string {
  if (!/^\/(?![/\\])[^\s?#\\]*$/.test(path) || path.length > 500 || path.split('/').includes('..'))
    throw new SiteError('invalid_path', `invalid path: ${JSON.stringify(path)}`);
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/** Hosts permitidos para destinos externos: el del sitio y los de `SITE_REDIRECT_HOSTS` (separados por comas). */
export function allowedHosts(env: Record<string, string | undefined> = process.env): string[] {
  const hosts = (env.SITE_REDIRECT_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (env.SITE_URL) hosts.push(new URL(env.SITE_URL).hostname.toLowerCase());
  return hosts;
}

/** Destino de redirección: ruta relativa o `https://` a un host permitido. */
export function assertRedirectTarget(to: string, hosts = allowedHosts()): string {
  if (to.startsWith('/')) return to.includes('?') ? `${normalizePath(to.split('?')[0]!)}?${to.split('?').slice(1).join('?')}` : normalizePath(to);
  let url: URL;
  try {
    url = new URL(to);
  } catch {
    throw new SiteError('invalid_link', `invalid redirect target: ${to}`);
  }
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname.toLowerCase()) || url.username || url.password)
    throw new SiteError('invalid_link', `redirect target host not allowed: ${url.hostname} (add it to SITE_REDIRECT_HOSTS)`);
  return url.toString();
}

/** Enlace de menú: ruta del sitio, `https://`, `mailto:` o `tel:`. */
export function isSafeLink(href: string): boolean {
  if (href.startsWith('/')) return /^\/(?![/\\])[^\s\\]*$/.test(href);
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href) || /^tel:\+?[0-9 ()-]{3,30}$/i.test(href)) return true;
  try {
    const u = new URL(href);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
