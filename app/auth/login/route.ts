import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  authCookieNames,
  publicBaseUrl,
  randomToken,
  safeReturnTo,
  secureCookieOptions,
  sha256,
} from "@/app/lib/auth";
import { runtimeEnv } from "@/app/lib/db";

export async function GET(request: Request) {
  const config = runtimeEnv();
  const requestUrl = new URL(request.url);
  const baseUrl = publicBaseUrl(request);
  const returnTo = safeReturnTo(requestUrl.searchParams.get("return_to"));

  if (!config.OIDC_ISSUER_URL || !config.OIDC_CLIENT_ID || !config.OIDC_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?auth=unavailable", baseUrl));
  }

  const issuer = config.OIDC_ISSUER_URL.replace(/\/$/, "");
  const discoveryResponse = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!discoveryResponse.ok) return NextResponse.redirect(new URL("/?auth=unavailable", baseUrl));
  const discovery = (await discoveryResponse.json()) as { authorization_endpoint: string };

  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = await sha256(verifier);
  const authorizationUrl = new URL(discovery.authorization_endpoint);
  authorizationUrl.searchParams.set("client_id", config.OIDC_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", `${baseUrl}/auth/callback`);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  const cookieStore = await cookies();
  cookieStore.set(authCookieNames().state, `${state}.${encodeURIComponent(returnTo)}`, secureCookieOptions(600));
  cookieStore.set(authCookieNames().verifier, verifier, secureCookieOptions(600));
  return NextResponse.redirect(authorizationUrl);
}
