// Tablas de @core/site. Ajustes y menús son contenido (@core/content); aquí solo las redirecciones.
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from '../db/index.js';

export const redirects = pgTable('redirects', {
  id: primaryId('rdr'),
  /** Ruta exacta de origen, sin query ni barra final: `/old-page`. */
  fromPath: text('from_path').notNull().unique(),
  /** Ruta relativa (`/new`) o URL https de un dominio permitido. */
  to: text('to').notNull(),
  status: integer('status').notNull().default(301),
  hits: integer('hits').notNull().default(0),
  lastHitAt: timestamp('last_hit_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
});

export type Redirect = typeof redirects.$inferSelect;
