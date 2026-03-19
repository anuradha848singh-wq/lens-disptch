import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Lazy initialization - only create pool/db when actually needed
// This allows MemStorage mode to work without DATABASE_URL
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getPool() {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle({ client: getPool(), schema });
  }
  return _db;
}

// Export for backward compatibility (but these will throw if DATABASE_URL is not set)
export const pool = new Proxy({} as Pool, {
  get: (_, prop) => {
    const p = getPool();
    return (p as any)[prop];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (_, prop) => {
    const d = getDb();
    return (d as any)[prop];
  }
});
