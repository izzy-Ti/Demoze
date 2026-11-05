import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Fixed-window rate limiting stored in Postgres (rate_limits table).
 * One atomic upsert per call, safe under concurrency.
 * Keys contain only hashed device ids, never IPs.
 */
export async function consume(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; count: number }> {
  const interval = `${Math.floor(windowSeconds)} seconds`;
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when rate_limits.window_start < now() - ${interval}::interval then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - ${interval}::interval then now()
        else rate_limits.window_start
      end
    returning count
  `);
  const count = Number(result.rows[0]?.count ?? 1);

  // Occasional cleanup of stale windows so the table stays small.
  if (Math.random() < 0.02) {
    await db.execute(sql`delete from rate_limits where window_start < now() - interval '2 days'`);
  }

  return { allowed: count <= limit, count };
}

/** Peek without consuming. */
export async function isLimited(key: string, limit: number, windowSeconds: number) {
  const interval = `${Math.floor(windowSeconds)} seconds`;
  const result = await db.execute<{ count: number }>(sql`
    select count from rate_limits
    where key = ${key} and window_start >= now() - ${interval}::interval
  `);
  return Number(result.rows[0]?.count ?? 0) >= limit;
}

export const DAY = 60 * 60 * 24;
export const HOUR = 60 * 60;
