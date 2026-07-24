import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import BetterSqlite3, { type Database as SqliteDatabase, type RunResult } from "better-sqlite3";

type RuntimeEnv = {
  DATABASE_PATH?: string;
  OIDC_ISSUER_URL?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  BASE_URL?: string;
  ADMIN_EMAILS?: string;
};

export function runtimeEnv(): RuntimeEnv {
  return {
    DATABASE_PATH: process.env.DATABASE_PATH,
    OIDC_ISSUER_URL: process.env.OIDC_ISSUER_URL,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    BASE_URL: process.env.BASE_URL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  };
}

class PreparedStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: SqliteDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T>() {
    return (this.database.prepare(this.query).get(...this.values) as T | undefined) ?? null;
  }

  async all<T>() {
    return { success: true, results: this.database.prepare(this.query).all(...this.values) as T[] };
  }

  async run() {
    const result = this.runSync();
    return { success: true, results: [], meta: result };
  }

  runSync(): RunResult {
    return this.database.prepare(this.query).run(...this.values);
  }
}

class AppDatabase {
  constructor(private readonly database: SqliteDatabase) {}

  prepare(query: string) {
    return new PreparedStatement(this.database, query);
  }

  async batch(statements: PreparedStatement[]) {
    const execute = this.database.transaction(() => statements.map((statement) => statement.runSync()));
    return execute().map((meta) => ({ success: true, results: [], meta }));
  }
}

const globalDatabase = globalThis as typeof globalThis & {
  __cofounderDatabase?: AppDatabase;
};

export function db() {
  if (!globalDatabase.__cofounderDatabase) {
    const configuredPath = runtimeEnv().DATABASE_PATH;
    const databasePath =
      configuredPath ?? join(process.cwd(), "data", "cofounder-exchange.sqlite");
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    const database = new BetterSqlite3(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    globalDatabase.__cofounderDatabase = new AppDatabase(database);
  }
  return globalDatabase.__cofounderDatabase;
}

let schemaReady: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL DEFAULT 'clerk',
    external_id TEXT NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    location TEXT NOT NULL DEFAULT '',
    timezone TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    skills TEXT NOT NULL DEFAULT '[]',
    links TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_provider_external_idx ON users(provider, external_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS mcp_tokens (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_hint TEXT NOT NULL,
    last_used_at TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS mcp_tokens_hash_idx ON mcp_tokens(token_hash)`,
  `CREATE INDEX IF NOT EXISTS mcp_tokens_user_idx ON mcp_tokens(user_id)`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    one_liner TEXT NOT NULL DEFAULT '',
    problem TEXT NOT NULL DEFAULT '',
    solution TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'idea',
    progress TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    project_url TEXT NOT NULL DEFAULT '',
    project_location TEXT NOT NULL DEFAULT '',
    work_mode TEXT NOT NULL DEFAULT 'remote',
    current_team TEXT NOT NULL DEFAULT '',
    role_title TEXT NOT NULL DEFAULT '',
    role_description TEXT NOT NULL DEFAULT '',
    skills_needed TEXT NOT NULL DEFAULT '[]',
    experience_needed TEXT NOT NULL DEFAULT '',
    weekly_commitment TEXT NOT NULL DEFAULT '',
    relationship TEXT NOT NULL DEFAULT '',
    exchange_types TEXT NOT NULL DEFAULT '[]',
    equity_min INTEGER,
    equity_max INTEGER,
    offer_details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    moderation_note TEXT NOT NULL DEFAULT '',
    submitted_at TEXT,
    reviewed_at TEXT,
    reviewed_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id)`,
  `CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)`,
  `CREATE TABLE IF NOT EXISTS moderation_events (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS moderation_project_idx ON moderation_events(project_id)`,
];

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const database = db();
      for (const statement of schemaStatements) {
        await database.prepare(statement).run();
      }
    })();
  }
  return schemaReady;
}

export type UserRecord = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  location: string;
  timezone: string;
  bio: string;
  skills: string;
  links: string;
};

export type ProjectRecord = {
  id: string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  title: string;
  one_liner: string;
  problem: string;
  solution: string;
  stage: string;
  progress: string;
  category: string;
  project_url: string;
  project_location: string;
  work_mode: string;
  current_team: string;
  role_title: string;
  role_description: string;
  skills_needed: string;
  experience_needed: string;
  weekly_commitment: string;
  relationship: string;
  exchange_types: string;
  equity_min: number | null;
  equity_max: number | null;
  offer_details: string;
  status: string;
  moderation_note: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type McpTokenRecord = {
  id: string;
  user_id: string;
  name: string;
  token_hint: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};
