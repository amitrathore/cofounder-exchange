import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { db, ensureSchema } from "@/app/lib/db";

const allowedActions = new Set(["approved", "changes_requested", "rejected", "archived"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reviewer = await getCurrentUser();
  if (!reviewer) return NextResponse.json({ error: "Sign in to review listings." }, { status: 401 });
  if (!reviewer.isAdmin) return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
  const body = (await request.json()) as { action?: string; note?: string };
  const action = body.action ?? "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!allowedActions.has(action)) return NextResponse.json({ error: "Invalid action." }, { status: 422 });
  if ((action === "changes_requested" || action === "rejected") && note.length < 10) {
    return NextResponse.json({ error: "Add a clear review note." }, { status: 422 });
  }

  await ensureSchema();
  const database = db();
  const project = await database.prepare("SELECT id FROM projects WHERE id = ?").bind(id).first();
  if (!project) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  await database.batch([
    database
      .prepare(
        "UPDATE projects SET status = ?, moderation_note = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(action, note, reviewer.id, id),
    database
      .prepare("INSERT INTO moderation_events (id, project_id, reviewer_id, action, note) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), id, reviewer.id, action, note),
  ]);
  return NextResponse.json({ id, status: action });
}
