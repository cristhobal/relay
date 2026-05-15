/**
 * MySQL connection pool — one pool per server instance, reused across requests.
 *
 * Required env vars:
 *   DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
 *
 * If DATABASE_HOST is not set the app falls back to localStorage-only mode,
 * which is useful for local development without a database.
 */

import mysql from "mysql2/promise"

let pool: mysql.Pool | null = null

export function dbConfigured(): boolean {
  return Boolean(import.meta.env.DATABASE_HOST)
}

export function getPool(): mysql.Pool {
  if (pool) return pool
  if (!dbConfigured()) {
    throw new Error(
      "Database is not configured. Set DATABASE_HOST and friends in your env."
    )
  }
  pool = mysql.createPool({
    host: import.meta.env.DATABASE_HOST,
    port: Number(import.meta.env.DATABASE_PORT ?? 3306),
    user: import.meta.env.DATABASE_USER,
    password: import.meta.env.DATABASE_PASSWORD,
    database: import.meta.env.DATABASE_NAME ?? "relay",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Return dates as strings — avoids timezone conversion overhead
    dateStrings: true,
    // Reuse prepared statements for parameterized queries
    namedPlaceholders: false,
    // Reduce connection overhead on serverless/cold starts
    connectTimeout: 5000,
  })
  return pool
}

/** Run a SELECT and return typed rows. */
export async function query<T = any>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params)
  return rows as T[]
}

/** Run an INSERT / UPDATE / DELETE and return result metadata. */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute(sql, params)
  return result as mysql.ResultSetHeader
}
