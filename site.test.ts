import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import * as contentSchema from '../content/schema.ts';
import { createEntry, publish, saveDraft, seedEntry } from '../content/index.ts';
import type { AdminContext } from '../contracts/index.ts';
import { testDb } from '../db/__fixtures__/pglite.ts';
import * as jobsSchema from '../jobs/schema.ts';
import { redirectMiddleware } from './adapters/hono.ts';
import { redirectFor } from './adapters/next.ts';
import * as schema from './schema.ts';
import {
  assertRedirectTarget,
  deleteRedirect,
  getMenu,
  getSiteSettings,
  invalidateRedirectCache,
  isSafeLink,
  normalizePath,
  redirectResponse,
  resolveRedirect,
  SiteError,
  redirectsAdminResource,
  siteAdminResources,
  upsertRedirect,
} from './index.ts';

beforeEach(async () => {
  await testDb(contentSchema, jobsSchema, schema);
  invalidateRedirectCache();
  process.env.SITE_URL = 'https://shop.example.com';
  process.env.SITE_REDIRECT_HOSTS = 'partner.example.org';
});

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    if (e instanceof SiteError) return e.code;
    if (e instanceof Error && e.name === 'ContentError') return (e as Error & { code: string }).code;
    throw e;
  }
};

describe('links and paths', () => {
  it('normalizes paths and rejects protocol-relative or traversal paths', () => {
    expect(normalizePath('/blog/')).toBe('/blog');
    expect(normalizePath('/')).toBe('/');
    for (const bad of ['blog', '//evil.com', '/\\evil.com', '/a/../b', '/a?x=1', '/a b']) expect(() => normalizePath(bad), bad).toThrow(SiteError);
  });

  it('allows external redirect targets only on https and allowed hosts', () => {
    expect(assertRedirectTarget('/new/')).toBe('/new');
    expect(assertRedirectTarget('/search?q=x')).toBe('/search?q=x');
    expect(assertRedirectTarget('https://partner.example.org/x')).toBe('https://partner.example.org/x');
    expect(assertRedirectTarget('https://shop.example.com/y')).toBe('https://shop.example.com/y');
    for (const bad of ['https://evil.com', 'http://partner.example.org', 'javascript:alert(1)', '//evil.com', 'https://u:p@partner.example.org'])
      expect(() => assertRedirectTarget(bad), bad).toThrow(SiteError);
  });

  it('menu links: paths, http(s), mailto and tel only', () => {
    for (const ok of ['/about', 'https://x.com', 'mailto:hi@x.com', 'tel:+34 600 000 000']) expect(isSafeLink(ok), ok).toBe(true);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'vbscript:x']) expect(isSafeLink(bad), bad).toBe(false);
  });
});

describe('settings and menus', () => {
  it('reads published settings and nested menus; rejects unsafe links', async () => {
    expect(await getSiteSettings()).toBeNull();
    await seedEntry({ collection: 'site_settings', data: { name: 'Tazas Co', social: [{ platform: 'instagram', url: 'https://instagram.com/tazas' }] } });
    expect(await getSiteSettings()).toMatchObject({ name: 'Tazas Co', legal: {} });
    const items = [{ label: 'Shop', href: '/shop', children: [{ label: 'Mugs', href: '/shop/mugs', children: [{ label: 'Red', href: '/shop/mugs/red' }] }] }];
    await seedEntry({ collection: 'menus', slug: 'header', data: { items } });
    expect(await getMenu('header')).toEqual(items);
    expect(await getMenu('footer')).toEqual([]);
    const bad = await createEntry({ collection: 'menus', slug: 'footer', data: {} });
    expect(await code(saveDraft(bad.id, { items: [{ label: 'x', href: 'javascript:alert(1)' }] }))).toBe('invalid_data');
    await saveDraft(bad.id, { items: [{ label: 'Contact', href: 'mailto:hi@tazas.co' }] });
    await publish(bad.id);
    expect((await getMenu('footer'))[0]?.href).toBe('mailto:hi@tazas.co');
  });
});

describe('redirects', () => {
  it('creates, resolves with query passthrough, counts hits and deletes', async () => {
    const r = await upsertRedirect({ from: '/old/', to: '/new' });
    expect(r.fromPath).toBe('/old');
    expect(await resolveRedirect('/old')).toEqual({ to: '/new', status: 301 });
    const res = await redirectResponse(new Request('https://shop.example.com/old?utm=x'));
    expect(res?.status).toBe(301);
    expect(res?.headers.get('location')).toBe('https://shop.example.com/new?utm=x');
    expect(await redirectResponse(new Request('https://shop.example.com/other'))).toBeNull();
    await upsertRedirect({ from: '/old', to: 'https://partner.example.org/p', status: 302 });
    expect(await resolveRedirect('/old')).toEqual({ to: 'https://partner.example.org/p', status: 302 });
    await deleteRedirect(r.id);
    expect(await resolveRedirect('/old')).toBeNull();
  });

  it('detects loops, including chains', async () => {
    expect(await code(upsertRedirect({ from: '/a', to: '/a' }))).toBe('redirect_loop');
    await upsertRedirect({ from: '/a', to: '/b' });
    await upsertRedirect({ from: '/b', to: '/c' });
    expect(await code(upsertRedirect({ from: '/c', to: '/a' }))).toBe('redirect_loop');
    expect(await code(upsertRedirect({ from: '/c', to: 'https://evil.com' }))).toBe('invalid_link');
  });

  it('Hono middleware and Next helper redirect GET requests only', async () => {
    await upsertRedirect({ from: '/promo', to: '/sale', status: 308 });
    const app = new Hono().use(redirectMiddleware).get('*', (c) => c.text('page')).post('*', (c) => c.text('posted'));
    expect((await app.request('/promo')).status).toBe(308);
    expect(await (await app.request('/promo', { method: 'POST' })).text()).toBe('posted');
    expect(await (await app.request('/x')).text()).toBe('page');
    expect((await redirectFor(new Request('https://shop.example.com/promo')))?.status).toBe(308);
    expect(await redirectFor(new Request('https://shop.example.com/promo', { method: 'POST' }))).toBeNull();
  });
});

describe('admin resources', () => {
  it('exposes settings, menus and redirects; redirects need permissions', async () => {
    const [settings, menusRes, redirectsRes] = siteAdminResources();
    expect([settings!.name, menusRes!.name, redirectsRes!.name]).toEqual(['site_settings', 'menus', 'redirects']);
    const ctx = (perms: string[]): AdminContext => ({ user: { id: 'usr_1', email: null, name: null }, can: async (p) => perms.includes(p) });
    const admin = ctx(['redirects:read', 'redirects:create', 'redirects:delete']);
    // El panel envía los nombres de los campos (`fromPath`); `from` sigue funcionando.
    const r = await redirectsRes!.create!({ fromPath: '/x', to: '/y', status: '302' }, admin);
    expect(redirectsRes!.fields.map((f) => f.name)).toContain('fromPath');
    expect(redirectsRes!.input!.safeParse({ fromPath: '/p', to: '/q' }).success).toBe(true);
    expect((redirectsRes!.input!.safeParse({ to: '/q' }).error?.issues[0]?.path ?? [])[0]).toBe('fromPath');
    expect(r.status).toBe(302);
    expect((await redirectsRes!.list({ page: 1, pageSize: 10, search: '/x' }, admin)).total).toBe(1);
    expect(await code(redirectsRes!.create!({ from: '/z', to: '/y' }, ctx([])))).toBe('forbidden');
    await redirectsRes!.delete!(r.id, admin);
    expect(await redirectsRes!.get(r.id, admin)).toBeNull();
  });

  it('editing a redirect updates that row by id and never overwrites another one', async () => {
    const redirectsRes = redirectsAdminResource;
    const admin: AdminContext = { user: { id: 'usr_1', email: null, name: null }, can: async () => true };
    const a = await redirectsRes.create!({ from: '/a', to: '/x' }, admin);
    const b = await redirectsRes.create!({ from: '/b', to: '/y' }, admin);
    const moved = await redirectsRes.update!(a.id, { from: '/a2', to: '/x', status: '302' }, admin);
    expect(moved).toMatchObject({ id: a.id, fromPath: '/a2', status: 302 });
    expect((await redirectsRes.list({ page: 1, pageSize: 10 }, admin)).rows.map((r) => r.fromPath)).toEqual(['/a2', '/b']);
    expect(await resolveRedirect('/a')).toBeNull();
    expect(await resolveRedirect('/a2')).toEqual({ to: '/x', status: 302 });
    // `from` de otra redirección: error (422 en el panel), sin tocar ninguna.
    expect(await code(redirectsRes.update!(a.id, { from: '/b', to: '/z' }, admin))).toBe('invalid_path');
    expect((await redirectsRes.get(b.id, admin))?.to).toBe('/y');
    expect((await redirectsRes.get(a.id, admin))?.fromPath).toBe('/a2');
    // Bucles: se comprueban sin contar el `from` anterior de la propia fila.
    expect(await code(redirectsRes.update!(a.id, { from: '/y', to: '/b' }, admin))).toBe('redirect_loop');
    expect((await redirectsRes.update!(b.id, { from: '/b', to: '/a2' }, admin)).to).toBe('/a2');
    expect(await code(redirectsRes.update!('red_missing', { from: '/q', to: '/r' }, admin))).toBe('not_found');
  });
});
