// Adaptador Hono: `app.use(redirectMiddleware)` antes de las rutas.
import type { MiddlewareHandler } from 'hono';
import { redirectResponse } from '../index.ts';

export const redirectMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    const res = await redirectResponse(c.req.raw);
    if (res) return res;
  }
  await next();
};
