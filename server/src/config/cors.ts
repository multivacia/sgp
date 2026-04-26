import type { CorsOptions } from 'cors'

export function corsOptions(origin: string): CorsOptions {
  return {
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email'],
  }
}
