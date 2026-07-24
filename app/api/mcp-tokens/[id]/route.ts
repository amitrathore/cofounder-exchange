import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { revokeMcpToken } from "@/app/lib/mcp-auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to revoke MCP access." }, { status: 401 });
  const { id } = await context.params;
  const revoked = await revokeMcpToken(user.id, id);
  if (!revoked) return NextResponse.json({ error: "Token not found." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
