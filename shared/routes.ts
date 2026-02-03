import { z } from 'zod';
import { insertIpoSchema, insertWatchlistSchema, ipos, watchlist } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  ipos: {
    list: {
      method: 'GET' as const,
      path: '/api/ipos',
      input: z.object({
        status: z.enum(['upcoming', 'open', 'closed']).optional(),
        sector: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof ipos.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/ipos/:id',
      responses: {
        200: z.custom<typeof ipos.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  watchlist: {
    list: {
      method: 'GET' as const,
      path: '/api/watchlist',
      responses: {
        200: z.array(z.custom<typeof watchlist.$inferSelect & { ipo: typeof ipos.$inferSelect }>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/watchlist',
      input: z.object({
        ipoId: z.number(),
      }),
      responses: {
        201: z.custom<typeof watchlist.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/watchlist/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type IpoResponse = z.infer<typeof api.ipos.get.responses[200]>;
export type WatchlistListResponse = z.infer<typeof api.watchlist.list.responses[200]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
