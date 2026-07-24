import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames, publicBaseUrl, sha256 } from "@/app/lib/auth";
import { db, ensureSchema } from "@/app/lib/db";

export async function GET(request: Request) {
  const token = (await cookies()).get(authCookieNames().session)?.value;
  if (token) {
    await ensureSchema();
    await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  (await cookies()).delete(authCookieNames().session);
  return NextResponse.redirect(new URL("/", publicBaseUrl(request)));
}
