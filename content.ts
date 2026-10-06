// Ajustes del sitio (singleton) y menús (colección; el slug es la ubicación: header, footer…) sobre @core/content.
import { z } from 'zod';
import type { AdminField } from '../contracts/index.ts';
import { defineCollection, defineSingleton, getEntry, getSingleton } from '../content/index.ts';
import { isSafeLink } from './links.ts';

const Link = z.string().max(500).refine(isSafeLink, 'Use a site path (/about), an https:// URL, mailto: or tel:');

export const SocialPlatforms = ['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'linkedin', 'pinterest', 'github', 'whatsapp', 'other'] as const;

export const SiteSettingsSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  /** Claves de @core/media o URLs (logo, favicon, imagen social por defecto). */
  logo: z.string().max(500).optional(),
  favicon: z.string().max(500).optional(),
  ogImage: z.string().max(500).optional(),
  contactEmail: z.email().optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  social: z.array(z.object({ platform: z.enum(SocialPlatforms), url: Link })).max(20).default([]),
  /** Rutas de las páginas legales (las plantillas las ponen los kits; aquí solo se asignan). */
  legal: z
    .object({ privacy: Link.optional(), terms: Link.optional(), cookies: Link.optional(), imprint: Link.optional(), returns: Link.optional() })
    .default({}),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;

export type MenuItem = { label: string; href: string; newTab?: boolean; children?: MenuItem[] };

const item = (depth: number): z.ZodType<MenuItem> =>
  z.object({
    label: z.string().min(1).max(80),
    href: Link,
    newTab: z.boolean().optional(),
    ...(depth > 1 ? { children: z.array(z.lazy(() => item(depth - 1))).max(30).optional() } : {}),
  }) as z.ZodType<MenuItem>;

/** Hasta 3 niveles de anidamiento. */
export const MenuSchema = z.object({ items: z.array(item(3)).max(30).default([]) });

const settingsFields: AdminField[] = [
  { name: 'name', label: 'Site name', type: 'text', required: true },
  { name: 'tagline', label: 'Tagline', type: 'text' },
  { name: 'logo', label: 'Logo', type: 'media' },
  { name: 'favicon', label: 'Favicon', type: 'media' },
  { name: 'ogImage', label: 'Default social image', type: 'media' },
  { name: 'contactEmail', label: 'Contact email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'social', label: 'Social profiles', type: 'json' },
  { name: 'legal', label: 'Legal pages', type: 'json' },
];

export const siteSettings = defineSingleton('site_settings', {
  schema: SiteSettingsSchema,
  label: { singular: 'Site settings', plural: 'Site settings' },
  fields: settingsFields,
  titleField: 'name',
});

export const menus = defineCollection('menus', {
  schema: MenuSchema,
  label: { singular: 'Menu', plural: 'Menus' },
  fields: [{ name: 'items', label: 'Items', type: 'json', required: true }],
});

/** Ajustes publicados (o null si aún no se han guardado). */
export async function getSiteSettings(opts: { locale?: string; draft?: boolean } = {}): Promise<SiteSettings | null> {
  return (await getSingleton<SiteSettings>('site_settings', opts))?.data ?? null;
}

/** Elementos del menú de una ubicación (`header`, `footer`…); vacío si no existe. */
export async function getMenu(location: string, opts: { locale?: string; draft?: boolean } = {}): Promise<MenuItem[]> {
  return (await getEntry<{ items: MenuItem[] }>('menus', location, opts))?.data.items ?? [];
}
