import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames, createSession, publicBaseUrl, safeReturnTo } from "@/app/lib/auth";
import { db, ensureSchema, runtimeEnv } from "@/app/lib/db";

type UserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = publicBaseUrl(request);
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(authCookieNames().state)?.value ?? "";
  const verifier = cookieStore.get(authCookieNames().verifier)?.value ?? "";
  const separator = stateCookie.indexOf(".");
  const expectedState = separator > 0 ? stateCookie.slice(0, separator) : "";
  const returnTo = safeReturnTo(separator > 0 ? decodeURIComponent(stateCookie.slice(separator + 1)) : null);
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");

  cookieStore.delete(authCookieNames().state);
  cookieStore.delete(authCookieNames().verifier);

  if (!state || !code || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL("/?auth=invalid-state", baseUrl));
  }

  const config = runtimeEnv();
  if (!config.OIDC_ISSUER_URL || !config.OIDC_CLIENT_ID || !config.OIDC_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?auth=unavailable", baseUrl));
  }

  const issuer = config.OIDC_ISSUER_URL.replace(/\/$/, "");
  const discoveryResponse = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!discoveryResponse.ok) return NextResponse.redirect(new URL("/?auth=failed", baseUrl));
  const discovery = (await discoveryResponse.json()) as {
    token_endpoint: string;
    userinfo_endpoint: string;
  };
  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.OIDC_CLIENT_ID,
      client_secret: config.OIDC_CLIENT_SECRET,
      redirect_uri: `${baseUrl}/auth/callback`,
      code_verifier: verifier,
    }),
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/?auth=failed", baseUrl));
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return NextResponse.redirect(new URL("/?auth=failed", baseUrl));

  const profileResponse = await fetch(discovery.userinfo_endpoint, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) return NextResponse.redirect(new URL("/?auth=failed", baseUrl));
  const profile = (await profileResponse.json()) as UserInfo;
  const email = profile.email?.trim().toLowerCase();
  const externalId = profile.sub?.trim();
  if (!email || !externalId || profile.email_verified === false) {
    return NextResponse.redirect(new URL("/?auth=profile-missing", baseUrl));
  }
  const fullName =
    profile.name?.trim() ||
    [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
    email.split("@")[0];

  await ensureSchema();
  const database = db();
  let user = await database
    .prepare("SELECT id FROM users WHERE provider = 'clerk' AND external_id = ?")
    .bind(externalId)
    .first<{ id: string }>();

  if (user) {
    await database
      .prepare("UPDATE users SET email = ?, full_name = ?, avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(email, fullName, profile.picture ?? null, user.id)
      .run();
  } else {
    const existingEmail = await database
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    if (existingEmail) {
      user = existingEmail;
      await database
        .prepare("UPDATE users SET provider = 'clerk', external_id = ?, full_name = ?, avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(externalId, fullName, profile.picture ?? null, user.id)
        .run();
    } else {
      user = { id: crypto.randomUUID() };
      await database
        .prepare("INSERT INTO users (id, provider, external_id, email, full_name, avatar_url) VALUES (?, 'clerk', ?, ?, ?, ?)")
        .bind(user.id, externalId, email, fullName, profile.picture ?? null)
        .run();
    }
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL(returnTo, baseUrl));
}
