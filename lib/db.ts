import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "./env";

function create() {
  return drizzle(neon(env.DATABASE_URL()), { schema });
}

type DB = ReturnType<typeof create>;
let instance: DB | null = null;

/** Neon (HTTP) + Drizzle client, created on first use so builds work without DATABASE_URL. */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    instance ??= create();
    return Reflect.get(instance, prop, instance);
  },
});
