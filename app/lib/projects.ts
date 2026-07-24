import { db, ensureSchema, type ProjectRecord } from "./db";

export const projectStatuses = [
  "draft",
  "pending",
  "changes_requested",
  "approved",
  "rejected",
  "archived",
] as const;

export const exchangeOptions = [
  "Equity",
  "Cash",
  "Revenue share",
  "Skill swap",
  "Open to discuss",
] as const;

export type ListingInput = {
  founder: {
    fullName: string;
    avatarUrl: string;
    location: string;
    timezone: string;
    bio: string;
    skills: string[];
    links: string[];
  };
  project: {
    title: string;
    oneLiner: string;
    problem: string;
    solution: string;
    stage: string;
    progress: string;
    category: string;
    projectUrl: string;
    projectLocation: string;
    workMode: string;
    currentTeam: string;
    roleTitle: string;
    roleDescription: string;
    skillsNeeded: string[];
    experienceNeeded: string;
    weeklyCommitment: string;
    relationship: string;
    exchangeTypes: string[];
    equityMin: number | null;
    equityMax: number | null;
    offerDetails: string;
  };
  intent: "draft" | "submit";
  trustConfirmed: boolean;
};

function clean(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item, 180)).filter(Boolean).slice(0, maxItems);
}

function safeUrl(value: unknown) {
  const candidate = clean(value, 500);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function percent(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 100 ? number : null;
}

export function parseListingInput(value: unknown): ListingInput {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const founderRaw = (raw.founder && typeof raw.founder === "object" ? raw.founder : {}) as Record<string, unknown>;
  const projectRaw = (raw.project && typeof raw.project === "object" ? raw.project : {}) as Record<string, unknown>;
  const exchangeTypes = stringList(projectRaw.exchangeTypes, 5).filter((item) =>
    exchangeOptions.includes(item as (typeof exchangeOptions)[number]),
  );

  return {
    founder: {
      fullName: clean(founderRaw.fullName, 120),
      avatarUrl: safeUrl(founderRaw.avatarUrl),
      location: clean(founderRaw.location, 120),
      timezone: clean(founderRaw.timezone, 80),
      bio: clean(founderRaw.bio, 900),
      skills: stringList(founderRaw.skills),
      links: stringList(founderRaw.links, 5).map(safeUrl).filter(Boolean),
    },
    project: {
      title: clean(projectRaw.title, 120),
      oneLiner: clean(projectRaw.oneLiner, 220),
      problem: clean(projectRaw.problem, 1800),
      solution: clean(projectRaw.solution, 1800),
      stage: clean(projectRaw.stage, 40) || "idea",
      progress: clean(projectRaw.progress, 1400),
      category: clean(projectRaw.category, 100),
      projectUrl: safeUrl(projectRaw.projectUrl),
      projectLocation: clean(projectRaw.projectLocation, 120),
      workMode: clean(projectRaw.workMode, 40) || "remote",
      currentTeam: clean(projectRaw.currentTeam, 600),
      roleTitle: clean(projectRaw.roleTitle, 120),
      roleDescription: clean(projectRaw.roleDescription, 1800),
      skillsNeeded: stringList(projectRaw.skillsNeeded),
      experienceNeeded: clean(projectRaw.experienceNeeded, 1000),
      weeklyCommitment: clean(projectRaw.weeklyCommitment, 100),
      relationship: clean(projectRaw.relationship, 100),
      exchangeTypes,
      equityMin: percent(projectRaw.equityMin),
      equityMax: percent(projectRaw.equityMax),
      offerDetails: clean(projectRaw.offerDetails, 1800),
    },
    intent: raw.intent === "submit" ? "submit" : "draft",
    trustConfirmed: raw.trustConfirmed === true,
  };
}

export function validateForSubmission(input: ListingInput) {
  const errors: Record<string, string> = {};
  const { founder, project } = input;
  if (!input.trustConfirmed) errors.trustConfirmed = "Confirm that the listing represents the project honestly.";
  if (!founder.fullName) errors.fullName = "Add your name.";
  if (founder.bio.length < 40) errors.bio = "Write at least 40 characters about yourself.";
  if (!founder.location) errors.location = "Add your location.";
  if (!founder.timezone) errors.timezone = "Add your time zone.";
  if (!founder.skills.length) errors.skills = "Add at least one skill.";
  if (!project.title) errors.title = "Name the project.";
  if (project.oneLiner.length < 20) errors.oneLiner = "Write a clear one-line description.";
  if (project.problem.length < 60) errors.problem = "Explain the problem in at least 60 characters.";
  if (project.solution.length < 60) errors.solution = "Explain the approach in at least 60 characters.";
  if (!project.category) errors.category = "Choose or enter a category.";
  if (!project.roleTitle) errors.roleTitle = "Name the cofounder role.";
  if (project.roleDescription.length < 60) errors.roleDescription = "Describe the role in at least 60 characters.";
  if (!project.skillsNeeded.length) errors.skillsNeeded = "Add at least one needed skill.";
  if (!project.weeklyCommitment) errors.weeklyCommitment = "Describe the expected time commitment.";
  if (!project.relationship) errors.relationship = "Describe the intended working relationship.";
  if (!project.exchangeTypes.length) errors.exchangeTypes = "Choose at least one form of exchange.";
  if (project.offerDetails.length < 40) errors.offerDetails = "Explain the proposed exchange in at least 40 characters.";
  if (
    project.exchangeTypes.includes("Equity") &&
    project.equityMin !== null &&
    project.equityMax !== null &&
    project.equityMin > project.equityMax
  ) {
    errors.equity = "The minimum equity cannot exceed the maximum.";
  }
  return errors;
}

export async function projectsForOwner(ownerId: string) {
  await ensureSchema();
  const result = await db()
    .prepare("SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC")
    .bind(ownerId)
    .all<ProjectRecord>();
  return result.results;
}

export async function projectForOwner(projectId: string, ownerId: string) {
  await ensureSchema();
  return db()
    .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
    .bind(projectId, ownerId)
    .first<ProjectRecord>();
}

export async function pendingProjects() {
  await ensureSchema();
  const result = await db()
    .prepare(
      `SELECT p.*, u.full_name AS owner_name, u.email AS owner_email
       FROM projects p JOIN users u ON u.id = p.owner_id
       WHERE p.status IN ('pending', 'changes_requested', 'approved', 'rejected')
       ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'changes_requested' THEN 1 ELSE 2 END, p.updated_at DESC`,
    )
    .all<ProjectRecord>();
  return result.results;
}

export function projectToForm(record: ProjectRecord) {
  return {
    id: record.id,
    title: record.title,
    oneLiner: record.one_liner,
    problem: record.problem,
    solution: record.solution,
    stage: record.stage,
    progress: record.progress,
    category: record.category,
    projectUrl: record.project_url,
    projectLocation: record.project_location,
    workMode: record.work_mode,
    currentTeam: record.current_team,
    roleTitle: record.role_title,
    roleDescription: record.role_description,
    skillsNeeded: JSON.parse(record.skills_needed || "[]") as string[],
    experienceNeeded: record.experience_needed,
    weeklyCommitment: record.weekly_commitment,
    relationship: record.relationship,
    exchangeTypes: JSON.parse(record.exchange_types || "[]") as string[],
    equityMin: record.equity_min,
    equityMax: record.equity_max,
    offerDetails: record.offer_details,
    status: record.status,
    moderationNote: record.moderation_note,
  };
}
