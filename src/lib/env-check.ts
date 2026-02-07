export function checkRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "GROQ_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing };
}

export function checkOptionalEnvVars(): string[] {
  const optional = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "SERPER_API_KEY",
  ];

  return optional.filter((key) => !process.env[key]);
}

/**
 * Note on Supabase connection pooling:
 * The Supabase JS client (@supabase/supabase-js) uses the REST API,
 * NOT direct Postgres connections. This means it does NOT suffer from
 * the serverless connection pooling issue.
 *
 * If you ever add a direct Postgres client (Prisma, Drizzle, pg, etc.),
 * use the Supabase Session Pooler connection string (port 6543) with
 * ?pgbouncer=true appended:
 *   postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
 */
