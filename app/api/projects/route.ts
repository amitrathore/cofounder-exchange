import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { db, ensureSchema } from "@/app/lib/db";
import { parseListingInput, validateForSubmission } from "@/app/lib/projects";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a listing." }, { status: 401 });
  const input = parseListingInput(await request.json());
  const errors = input.intent === "submit" ? validateForSubmission(input) : {};
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  await ensureSchema();
  const database = db();
  await database
    .prepare(
      `UPDATE users SET full_name = ?, avatar_url = ?, location = ?, timezone = ?, bio = ?,
       skills = ?, links = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .bind(
      input.founder.fullName || user.full_name,
      input.founder.avatarUrl || null,
      input.founder.location,
      input.founder.timezone,
      input.founder.bio,
      JSON.stringify(input.founder.skills),
      JSON.stringify(input.founder.links),
      user.id,
    )
    .run();

  const p = input.project;
  const id = crypto.randomUUID();
  const status = input.intent === "submit" ? "pending" : "draft";
  await database
    .prepare(
      `INSERT INTO projects (
        id, owner_id, title, one_liner, problem, solution, stage, progress, category, project_url,
        project_location, work_mode, current_team, role_title, role_description, skills_needed,
        experience_needed, weekly_commitment, relationship, exchange_types, equity_min, equity_max,
        offer_details, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, user.id, p.title, p.oneLiner, p.problem, p.solution, p.stage, p.progress, p.category,
      p.projectUrl, p.projectLocation, p.workMode, p.currentTeam, p.roleTitle, p.roleDescription,
      JSON.stringify(p.skillsNeeded), p.experienceNeeded, p.weeklyCommitment, p.relationship,
      JSON.stringify(p.exchangeTypes), p.equityMin, p.equityMax, p.offerDetails, status,
      status === "pending" ? new Date().toISOString() : null,
    )
    .run();
  return NextResponse.json({ id, status });
}
