// Adaptador Next.js, sin importar `next`. En `middleware.ts` (runtime Node, Next ≥ 15.5):
//   import { redirectFor } from '@/lib/site/adapters/next';
//   export async function middleware(req: Request) { return (await redirectFor(req)) ?? undefined; }
//   export const config = { runtime: 'nodejs', matcher: ['/((?!_next|api|favicon.ico).*)'] };
// Sin middleware Node: llama a `redirectFor` desde `app/not-found.tsx` o desde un catch-all antes del 404.
import { redirectResponse } from '../index.js';

export async function redirectFor(req: Request): Promise<Response | null> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;
  return redirectResponse(req);
}
