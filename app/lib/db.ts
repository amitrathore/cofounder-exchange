type RuntimeEnv = {
  DB?: D1Database;
  OIDC_ISSUER_URL?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  BASE_URL?: string;
  ADMIN_EMAILS?: string;
};

export function runtimeEnv(): RuntimeEnv {
  const appGlobal = globalThis as typeof globalThis & {
    __COFOUNDER_ENV__?: Record<string, unknown>;
  };
  return (appGlobal.__COFOUNDER_ENV__ ?? {}) as RuntimeEnv;
}

export function db(): D1Database {
  const binding = runtimeEnv().DB;
  if (!binding) throw new Error("The DB binding is unavailable.");
  return binding;
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
