import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, ensureSchema, runtimeEnv, type UserRecord } from "./db";

const SESSION_COOKIE = "cofounder_exchange_session";
const STATE_COOKIE = "cofounder_exchange_oidc_state";
const VERIFIER_COOKIE = "cofounder_exchange_oidc_verifier";
const SESSION_DAYS = 30;

export type SessionUser = UserRecord & { isAdmin: boolean };

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function randomToken(size = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64url(new Uint8Array(digest));
}

function isAdminEmail(email: string) {
  const configured = runtimeEnv().ADMIN_EMAILS ?? "";
  return configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const tokenHash = await sha256(token);
  const record = await db()
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.location, u.timezone, u.bio, u.skills, u.links
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP`,
    )
    .bind(tokenHash)
    .first<UserRecord>();
  return record ? { ...record, isAdmin: isAdminEmail(record.email) } : null;
}

export async function requireUser(returnTo = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`);
  return user;
}

export async function requireAdmin(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  if (!user.isAdmin) redirect("/dashboard?notice=admin-required");
  return user;
}

export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  try {
    const parsed = new URL(value, "https://cofounder.exchange");
    if (parsed.origin !== "https://cofounder.exchange") return "/dashboard";
    if (parsed.pathname.startsWith("/auth/")) return "/dashboard";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/dashboard";
  }
}

export function publicBaseUrl(request: Request) {
  const configured = runtimeEnv().BASE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("BASE_URL must use http or https.");
    }
    return url.origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? "https";
    return new URL(`${forwardedProtocol}://${forwardedHost}`).origin;
  }

  return new URL(request.url).origin;
}

export function authCookieNames() {
  return { session: SESSION_COOKIE, state: STATE_COOKIE, verifier: VERIFIER_COOKIE };
}

export function secureCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: runtimeEnv().BASE_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge,
  };
}

export async function createSession(userId: string) {
  await ensureSchema();
  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, userId, expiresAt)
    .run();
  (await cookies()).set(SESSION_COOKIE, token, secureCookieOptions(SESSION_DAYS * 86400));
}
