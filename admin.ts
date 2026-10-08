// Recursos de panel: ajustes y menús (vía @core/content) y redirecciones.
import { asc, count, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { contentAdminResource } from '../content/index.ts';
import type { AdminContext, AdminResource } from '../contracts/index.ts';
import { getDb } from '../db/index.ts';
import { SiteError } from './links.ts';
import { deleteRedirect, REDIRECT_STATUSES, updateRedirect, upsertRedirect } from './redirects.ts';
import { type Redirect, redirects } from './schema.ts';

// El panel envía los campos por su `name` (`fromPath`, como la columna); `from` se sigue aceptando por compatibilidad.
const RedirectInput = z
  .preprocess(
    (v) => (v && typeof v === 'object' && !('fromPath' in v) && 'from' in v ? { ...v, fromPath: (v as { from: unknown }).from } : v),
    z.object({
      fromPath: z.string(),
      to: z.string(),
      status: z.coerce.number().pipe(z.union(REDIRECT_STATUSES.map((s) => z.literal(s)) as [z.ZodLiteral<301>, z.ZodLiteral<302>, z.ZodLiteral<307>, z.ZodLiteral<308>])).optional(),
    }),
  )
  .transform(({ fromPath, ...rest }) => ({ from: fromPath, ...rest }));

async function need(ctx: AdminContext, action: string) {
  if (!(await ctx.can(`redirects:${action}`))) throw new SiteError('forbidden', `forbidden: redirects:${action}`);
}

export const redirectsAdminResource: AdminResource<Redirect> = {
  name: 'redirects',
  label: { singular: 'Redirect', plural: 'Redirects' },
  group: 'Settings',
  fields: [
    { name: 'fromPath', label: 'From', type: 'text', required: true, list: true },
    { name: 'to', label: 'To', type: 'text', required: true, list: true },
    { name: 'status', label: 'Status', type: 'select', list: true, options: REDIRECT_STATUSES.map((s) => ({ value: String(s), label: String(s) })) },
    { name: 'hits', label: 'Hits', type: 'number', readOnly: true, list: true },
  ],
  input: RedirectInput,
  title: (r) => `${r.fromPath} → ${r.to}`,
  async list(q, ctx) {
    await need(ctx, 'read');
    const where = q.search ? or(ilike(redirects.fromPath, `%${q.search}%`), ilike(redirects.to, `%${q.search}%`)) : undefined;
    const [total] = await getDb().select({ n: count() }).from(redirects).where(where);
    const rows = await getDb().select().from(redirects).where(where).orderBy(asc(redirects.fromPath)).limit(q.pageSize).offset((Math.max(q.page, 1) - 1) * q.pageSize);
    return { rows, total: total?.n ?? 0 };
  },
  async get(id, ctx) {
    await need(ctx, 'read');
    const [row] = await getDb().select().from(redirects).where(eq(redirects.id, id));
    return row ?? null;
  },
  async create(input, ctx) {
    await need(ctx, 'create');
    return upsertRedirect(RedirectInput.parse(input));
  },
  async update(id, input, ctx) {
    await need(ctx, 'update');
    return updateRedirect(id, RedirectInput.parse(input));
  },
  async delete(id, ctx) {
    await need(ctx, 'delete');
    await deleteRedirect(id);
  },
};

/** Los tres recursos de este paquete, para `src/genpm/admin.ts`. */
export const siteAdminResources = () => [contentAdminResource('site_settings'), contentAdminResource('menus'), redirectsAdminResource];
