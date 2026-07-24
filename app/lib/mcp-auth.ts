import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { db, ensureSchema, type McpTokenRecord, type UserRecord } from "./db";

const TOKEN_PREFIX = "cfx_";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export async function mcpTokensForUser(userId: string) {
  await ensureSchema();
  const result = await db()
    .prepare(
      `SELECT id, user_id, name, token_hint, last_used_at, revoked_at, created_at
       FROM mcp_tokens
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<McpTokenRecord>();
  return result.results;
}

export async function createMcpToken(userId: string, requestedName: unknown) {
  await ensureSchema();
  const id = crypto.randomUUID();
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const name = cleanName(requestedName) || "Codex / Claude";
  const tokenHint = `${token.slice(0, 8)}…${token.slice(-4)}`;
  await db()
    .prepare(
      `INSERT INTO mcp_tokens (id, user_id, name, token_hash, token_hint)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, name, tokenHash(token), tokenHint)
    .run();
  return {
    token,
    record: {
      id,
      user_id: userId,
      name,
      token_hint: tokenHint,
      last_used_at: null,
      revoked_at: null,
      created_at: new Date().toISOString(),
    } satisfies McpTokenRecord,
  };
}

export async function revokeMcpToken(userId: string, tokenId: string) {
  await ensureSchema();
  const token = await db()
    .prepare("SELECT id FROM mcp_tokens WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
    .bind(tokenId, userId)
    .first<{ id: string }>();
  if (!token) return false;
  await db()
    .prepare("UPDATE mcp_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
    .bind(tokenId, userId)
    .run();
  return true;
}

export async function authenticateMcpRequest(request: Request) {
  await ensureSchema();
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1].startsWith(TOKEN_PREFIX)) return null;

  const record = await db()
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.location, u.timezone, u.bio, u.skills, u.links,
              t.id AS token_id
       FROM mcp_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ? AND t.revoked_at IS NULL`,
    )
    .bind(tokenHash(match[1]))
    .first<UserRecord & { token_id: string }>();
  if (!record) return null;

  await db()
    .prepare("UPDATE mcp_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(record.token_id)
    .run();
  return record;
}
