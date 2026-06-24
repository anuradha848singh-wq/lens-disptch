import "dotenv/config";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { sql } from "drizzle-orm";
import pg from 'pg';
import ws from "ws";
import * as schema from "../shared/schema";

// Helper to detect if we're using Neon
const isNeon = (url: string) => url.includes('neon.tech');

let _db: any = null;
let _isAvailable = false;

export async function checkDbConnection(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return false;

  try {
    const d = getDb();
    if (!d) return false;
    
    // Simple query to verify connectivity
    if (isNeon(url)) {
      // Neon/Serverless check
      await d.execute(sql`SELECT 1`);
    } else {
      // Standard PG check
      const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2000 });
      await client.connect();
      await client.end();
    }
    _isAvailable = true;
    return true;
  } catch (err) {
    _isAvailable = false;
    return false;
  }
}

export function isDbConnected() {
  return _isAvailable;
}

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.warn("DATABASE_URL is not set. The application will run in Demo Mode (in-memory).");
      return null;
    }

    try {
      if (isNeon(url)) {
        neonConfig.webSocketConstructor = ws;
        const pool = new Pool({ connectionString: url });
        _db = drizzleNeon({ client: pool, schema });
        console.log("[DB] Using Neon Serverless driver (WebSocket)");
      } else {
        const pool = new pg.Pool({ 
          connectionString: url,
          connectionTimeoutMillis: 10000,
          max: 30,
          idleTimeoutMillis: 60000,
          allowExitOnIdle: false,
        });
        _db = drizzlePg({ client: pool, schema });
        console.log("[DB] Using standard Node-Postgres driver (Supabase/Railway)");
      }
    } catch (err) {
      console.error("[DB] Failed to initialize database connection:", err);
      return null;
    }
  }
  return _db;
}

// Export for application use
export const db = new Proxy({} as any, {
  get: (_, prop) => {
    const d = getDb();
    if (!d) throw new Error("Database is not initialized or unreachable.");
    return d[prop];
  }
});

// We keep these for types, but they will delegate to the correct implementation
export { schema };
