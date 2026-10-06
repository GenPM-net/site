// Redirecciones gestionables desde el panel, con detección de bucles y caché en memoria para el middleware.
import { and, eq, ne, sql } from 'drizzle-orm';
import { type Executor, getDb } from '../db/index.ts';
import { allowedHosts, assertRedirectTarget, normalizePath, SiteError } from './links.ts';
import { type Redirect, redirects } from './schema.ts';

export const REDIRECT_STATUSES = [301, 302, 307, 308] as const;
export type RedirectStatus = (typeof REDIRECT_STATUSES)[number];

let cache: { at: number; map: Map<string, { to: string; status: number }> } | null = null;
const TTL_MS = 60_000;

export const invalidateRedirectCache = () => {
  cache = null;
};

/** `exceptId`: la redirección que se está editando (su `from` anterior deja de contar). */
async function assertNoLoop(from: string, to: string, db: Executor, exceptId?: string): Promise<void> {
  if (!to.startsWith('/')) return;
  const rows = await db.select().from(redirects);
  const all = new Map(rows.filter((r) => r.id !== exceptId).map((r) => [r.fromPath, r.to]));
  all.set(from, to);
  let current: string | undefined = from;
  for (let i = 0; i < 20 && current; i++) {
    const next = all.get(current);
    if (!next?.startsWith('/')) return;
    current = normalizePath(next.split('?')[0]!);
    if (current === from) throw new SiteError('redirect_loop', `redirect loop: ${from} → … → ${from}`);
  }
}

export async function upsertRedirect(
  input: { from: string; to: string; status?: RedirectStatus },
  db: Executor = getDb(),
): Promise<Redirect> {
  const fromPath = normalizePath(input.from);
  const to = assertRedirectTarget(input.to, allowedHosts());
  const status = input.status ?? 301;
  if (!REDIRECT_STATUSES.includes(status)) throw new SiteError('invalid_link', `invalid status ${status}`);
  await assertNoLoop(fromPath, to, db);
  const [row] = await db
    .insert(redirects)
    .values({ fromPath, to, status })
    .onConflictDoUpdate({ target: redirects.fromPath, set: { to, status } })
    .returning();
  invalidateRedirectCache();
  return row!;
}

/**
 * Edita la redirección `id` (puede cambiar también su `from`). Si el nuevo `from` ya es de otra redirección, falla con
 * `invalid_path` en vez de pisarla.
 */
export async function updateRedirect(
  id: string,
  input: { from: string; to: string; status?: RedirectStatus },
  db: Executor = getDb(),
): Promise<Redirect> {
  const fromPath = normalizePath(input.from);
  const to = assertRedirectTarget(input.to, allowedHosts());
  const status = input.status ?? 301;
  if (!REDIRECT_STATUSES.includes(status)) throw new SiteError('invalid_link', `invalid status ${status}`);
  const [taken] = await db.select({ id: redirects.id }).from(redirects).where(and(eq(redirects.fromPath, fromPath), ne(redirects.id, id)));
  if (taken) throw new SiteError('invalid_path', `a redirect from ${fromPath} already exists`);
  await assertNoLoop(fromPath, to, db, id);
  let row: Redirect | undefined;
  try {
    [row] = await db.update(redirects).set({ fromPath, to, status }).where(eq(redirects.id, id)).returning();
  } catch {
    // Carrera con otra edición que acaba de ocupar ese `from` (índice único).
    throw new SiteError('invalid_path', `a redirect from ${fromPath} already exists`);
  }
  if (!row) throw new SiteError('not_found', `redirect ${id} not found`);
  invalidateRedirectCache();
  return row;
}

export async function deleteRedirect(id: string, db: Executor = getDb()): Promise<void> {
  await db.delete(redirects).where(eq(redirects.id, id));
  invalidateRedirectCache();
}

/** Destino para una ruta, o null. Usa una caché de 60 s (se invalida al editar en este proceso). */
export async function resolveRedirect(pathname: string, db: Executor = getDb()): Promise<{ to: string; status: number } | null> {
  let path: string;
  try {
    path = normalizePath(pathname);
  } catch {
    return null;
  }
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const rows = await db.select({ fromPath: redirects.fromPath, to: redirects.to, status: redirects.status }).from(redirects);
    cache = { at: Date.now(), map: new Map(rows.map((r) => [r.fromPath, { to: r.to, status: r.status }])) };
  }
  const hit = cache.map.get(path);
  if (!hit) return null;
  // Contador sin bloquear la respuesta.
  void db
    .update(redirects)
    .set({ hits: sql`${redirects.hits} + 1`, lastHitAt: new Date() })
    .where(eq(redirects.fromPath, path))
    .catch(() => {});
  return hit;
}

/** Respuesta de redirección para una petición (conserva la query de origen si el destino no trae la suya). */
export async function redirectResponse(req: Request, db: Executor = getDb()): Promise<Response | null> {
  const url = new URL(req.url);
  const hit = await resolveRedirect(url.pathname, db);
  if (!hit) return null;
  const target = hit.to.startsWith('/') ? new URL(hit.to, url.origin) : new URL(hit.to);
  if (!target.search && url.search) target.search = url.search;
  return new Response(null, { status: hit.status, headers: { location: target.toString() } });
}
