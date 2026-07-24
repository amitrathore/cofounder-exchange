import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { db, ensureSchema, type ProjectRecord, type UserRecord } from "./db";
import {
  parseListingInput,
  projectToForm,
  projectsForOwner,
  validateForSubmission,
  type ListingInput,
} from "./projects";

const stageSchema = z
  .enum(["idea", "validation", "prototype", "launched", "revenue"])
  .describe("Current project stage.");
const workModeSchema = z
  .enum(["remote", "hybrid", "in-person", "flexible"])
  .describe("How the team expects to work.");
const exchangeTypeSchema = z.enum([
  "Equity",
  "Cash",
  "Revenue share",
  "Skill swap",
  "Open to discuss",
]);

const projectFields = {
  title: z.string().max(120).optional().describe("Project name."),
  oneLiner: z.string().max(220).optional().describe("A crisp one-line project description."),
  problem: z.string().max(1800).optional().describe("The problem and who experiences it."),
  solution: z.string().max(1800).optional().describe("The product or approach being built."),
  stage: stageSchema.optional(),
  progress: z.string().max(1400).optional().describe("Evidence, traction, research, or progress so far."),
  category: z.string().max(100).optional().describe("Project category or industry."),
  projectUrl: z.string().max(500).optional().describe("Optional public project URL."),
  projectLocation: z.string().max(120).optional().describe("Geographic focus or team location."),
  workMode: workModeSchema.optional(),
  currentTeam: z.string().max(600).optional().describe("People already involved and what they own."),
  roleTitle: z.string().max(120).optional().describe("The cofounder role being sought."),
  roleDescription: z.string().max(1800).optional().describe("What the cofounder will own."),
  skillsNeeded: z.array(z.string().max(180)).max(12).optional().describe("Skills the cofounder should bring."),
  experienceNeeded: z.string().max(1000).optional().describe("Relevant experience and qualities."),
  weeklyCommitment: z.string().max(100).optional().describe("Expected weekly or full-time commitment."),
  relationship: z.string().max(100).optional().describe("Intended partnership or working relationship."),
  exchangeTypes: z
    .array(exchangeTypeSchema)
    .max(5)
    .optional()
    .describe("Compensation or value exchange under consideration."),
  equityMin: z.number().int().min(0).max(100).nullable().optional().describe("Optional minimum equity percent."),
  equityMax: z.number().int().min(0).max(100).nullable().optional().describe("Optional maximum equity percent."),
  offerDetails: z.string().max(1800).optional().describe("Details and conditions of the proposed exchange."),
};

function jsonList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function founderData(user: UserRecord) {
  return {
    fullName: user.full_name,
    email: user.email,
    avatarUrl: user.avatar_url ?? "",
    location: user.location,
    timezone: user.timezone,
    bio: user.bio,
    skills: jsonList(user.skills),
    links: jsonList(user.links),
  };
}

function projectData(project: ProjectRecord) {
  return {
    ...projectToForm(project),
    status: project.status,
    moderationNote: project.moderation_note,
    submittedAt: project.submitted_at,
    reviewedAt: project.reviewed_at,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function toolError(message: string, details?: Record<string, unknown>) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message, ...details }, null, 2),
      },
    ],
  };
}

async function userById(userId: string) {
  await ensureSchema();
  return db()
    .prepare(
      `SELECT id, email, full_name, avatar_url, location, timezone, bio, skills, links
       FROM users WHERE id = ?`,
    )
    .bind(userId)
    .first<UserRecord>();
}

function listingInput(
  user: UserRecord,
  project: Record<string, unknown>,
  intent: "draft" | "submit",
  trustConfirmed = false,
) {
  return parseListingInput({
    founder: founderData(user),
    project,
    intent,
    trustConfirmed,
  });
}

async function insertProject(userId: string, input: ListingInput) {
  const p = input.project;
  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO projects (
        id, owner_id, title, one_liner, problem, solution, stage, progress, category, project_url,
        project_location, work_mode, current_team, role_title, role_description, skills_needed,
        experience_needed, weekly_commitment, relationship, exchange_types, equity_min, equity_max,
        offer_details, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL)`,
    )
    .bind(
      id,
      userId,
      p.title,
      p.oneLiner,
      p.problem,
      p.solution,
      p.stage,
      p.progress,
      p.category,
      p.projectUrl,
      p.projectLocation,
      p.workMode,
      p.currentTeam,
      p.roleTitle,
      p.roleDescription,
      JSON.stringify(p.skillsNeeded),
      p.experienceNeeded,
      p.weeklyCommitment,
      p.relationship,
      JSON.stringify(p.exchangeTypes),
      p.equityMin,
      p.equityMax,
      p.offerDetails,
    )
    .run();
  return id;
}

async function updateProjectRecord(userId: string, projectId: string, input: ListingInput) {
  const p = input.project;
  await db()
    .prepare(
      `UPDATE projects SET title=?, one_liner=?, problem=?, solution=?, stage=?, progress=?, category=?,
       project_url=?, project_location=?, work_mode=?, current_team=?, role_title=?, role_description=?,
       skills_needed=?, experience_needed=?, weekly_commitment=?, relationship=?, exchange_types=?,
       equity_min=?, equity_max=?, offer_details=?, status='draft', moderation_note='',
       submitted_at=NULL, reviewed_at=NULL, reviewed_by=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND owner_id=?`,
    )
    .bind(
      p.title,
      p.oneLiner,
      p.problem,
      p.solution,
      p.stage,
      p.progress,
      p.category,
      p.projectUrl,
      p.projectLocation,
      p.workMode,
      p.currentTeam,
      p.roleTitle,
      p.roleDescription,
      JSON.stringify(p.skillsNeeded),
      p.experienceNeeded,
      p.weeklyCommitment,
      p.relationship,
      JSON.stringify(p.exchangeTypes),
      p.equityMin,
      p.equityMax,
      p.offerDetails,
      projectId,
      userId,
    )
    .run();
}

export function createCofounderMcpServer(userId: string) {
  const server = new McpServer(
    { name: "cofounder-exchange", version: "1.0.0" },
    {
      instructions:
        "Manage only the authenticated member's Cofounder Exchange profile and projects. Read the current profile/project before changing it. Build projects as drafts over multiple calls. Never call submit_project unless the user explicitly asks to submit and confirms the listing is honest. Archiving is destructive and must be explicitly requested. Never invent founder experience, traction, compensation, or equity terms; ask the user when details are missing.",
    },
  );

  server.registerTool(
    "get_founder_profile",
    {
      title: "Get founder profile",
      description: "Read the authenticated member's founder profile.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      const user = await userById(userId);
      return user ? toolResult({ profile: founderData(user) }) : toolError("Founder profile not found.");
    },
  );

  server.registerTool(
    "update_founder_profile",
    {
      title: "Update founder profile",
      description: "Update selected founder profile fields. Omitted fields remain unchanged.",
      inputSchema: {
        fullName: z.string().max(120).optional(),
        avatarUrl: z.string().max(500).optional(),
        location: z.string().max(120).optional(),
        timezone: z.string().max(80).optional(),
        bio: z.string().max(900).optional(),
        skills: z.array(z.string().max(180)).max(12).optional(),
        links: z.array(z.string().max(500)).max(5).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (changes) => {
      const current = await userById(userId);
      if (!current) return toolError("Founder profile not found.");
      const parsed = parseListingInput({
        founder: {
          ...founderData(current),
          ...changes,
        },
        project: {},
        intent: "draft",
      }).founder;
      await db()
        .prepare(
          `UPDATE users SET full_name=?, avatar_url=?, location=?, timezone=?, bio=?, skills=?, links=?,
           updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        )
        .bind(
          parsed.fullName || current.full_name,
          parsed.avatarUrl || null,
          parsed.location,
          parsed.timezone,
          parsed.bio,
          JSON.stringify(parsed.skills),
          JSON.stringify(parsed.links),
          userId,
        )
        .run();
      const updated = await userById(userId);
      return toolResult({ updated: true, profile: updated ? founderData(updated) : null });
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List every project owned by the authenticated member, including drafts and archived projects.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      const projects = await projectsForOwner(userId);
      return toolResult({ projects: projects.map(projectData) });
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get project",
      description: "Read one project owned by the authenticated member.",
      inputSchema: { projectId: z.string().uuid().describe("Cofounder Exchange project ID.") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ projectId }) => {
      const project = await db()
        .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
        .bind(projectId, userId)
        .first<ProjectRecord>();
      return project ? toolResult({ project: projectData(project) }) : toolError("Project not found.");
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project draft",
      description: "Create a new project draft. Partial drafts are welcome and can be completed later.",
      inputSchema: projectFields,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (project) => {
      const user = await userById(userId);
      if (!user) return toolError("Founder profile not found.");
      const id = await insertProject(userId, listingInput(user, project, "draft"));
      const created = await db()
        .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
        .bind(id, userId)
        .first<ProjectRecord>();
      return toolResult({ created: true, project: created ? projectData(created) : { id, status: "draft" } });
    },
  );

  server.registerTool(
    "update_project",
    {
      title: "Update project draft",
      description:
        "Update selected fields on an owned project. Omitted fields remain unchanged. The project returns to draft status.",
      inputSchema: {
        projectId: z.string().uuid().describe("Cofounder Exchange project ID."),
        ...projectFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ projectId, ...changes }) => {
      const existing = await db()
        .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
        .bind(projectId, userId)
        .first<ProjectRecord>();
      if (!existing) return toolError("Project not found.");
      if (existing.status === "archived") return toolError("Archived projects cannot be edited.");
      const user = await userById(userId);
      if (!user) return toolError("Founder profile not found.");
      const input = listingInput(user, { ...projectToForm(existing), ...changes }, "draft");
      await updateProjectRecord(userId, projectId, input);
      const updated = await db()
        .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
        .bind(projectId, userId)
        .first<ProjectRecord>();
      return toolResult({ updated: true, project: updated ? projectData(updated) : null });
    },
  );

  server.registerTool(
    "submit_project",
    {
      title: "Submit project for review",
      description:
        "Validate a complete project and submit it for moderation. Call only after the user explicitly confirms submission.",
      inputSchema: {
        projectId: z.string().uuid().describe("Cofounder Exchange project ID."),
        trustConfirmed: z
          .boolean()
          .describe("Must be true only when the user confirms the listing represents the project honestly."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ projectId, trustConfirmed }) => {
      if (!trustConfirmed) return toolError("Explicit trust confirmation is required before submission.");
      const project = await db()
        .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
        .bind(projectId, userId)
        .first<ProjectRecord>();
      if (!project) return toolError("Project not found.");
      if (project.status === "archived") return toolError("Archived projects cannot be submitted.");
      const user = await userById(userId);
      if (!user) return toolError("Founder profile not found.");
      const input = listingInput(user, projectToForm(project), "submit", true);
      const errors = validateForSubmission(input);
      if (Object.keys(errors).length) {
        return toolError("The project needs more detail before submission.", { validationErrors: errors });
      }
      await db()
        .prepare(
          `UPDATE projects SET status='pending', moderation_note='', submitted_at=CURRENT_TIMESTAMP,
           reviewed_at=NULL, reviewed_by=NULL, updated_at=CURRENT_TIMESTAMP
           WHERE id=? AND owner_id=?`,
        )
        .bind(projectId, userId)
        .run();
      return toolResult({ submitted: true, projectId, status: "pending" });
    },
  );

  server.registerTool(
    "archive_project",
    {
      title: "Archive project",
      description: "Archive an owned project so it is no longer active or editable.",
      inputSchema: { projectId: z.string().uuid().describe("Cofounder Exchange project ID.") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ projectId }) => {
      const project = await db()
        .prepare("SELECT id FROM projects WHERE id = ? AND owner_id = ?")
        .bind(projectId, userId)
        .first<{ id: string }>();
      if (!project) return toolError("Project not found.");
      await db()
        .prepare(
          `UPDATE projects SET status='archived', updated_at=CURRENT_TIMESTAMP
           WHERE id=? AND owner_id=?`,
        )
        .bind(projectId, userId)
        .run();
      return toolResult({ archived: true, projectId, status: "archived" });
    },
  );

  return server;
}
