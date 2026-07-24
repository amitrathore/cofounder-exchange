import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { createMcpToken, mcpTokensForUser } from "@/app/lib/mcp-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage MCP access." }, { status: 401 });
  return NextResponse.json({ tokens: await mcpTokensForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to create an MCP token." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  return NextResponse.json(await createMcpToken(user.id, body.name), { status: 201 });
}
