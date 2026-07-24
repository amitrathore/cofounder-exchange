import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull().default("clerk"),
    externalId: text("external_id").notNull(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    avatarUrl: text("avatar_url"),
    location: text("location").notNull().default(""),
    timezone: text("timezone").notNull().default(""),
    bio: text("bio").notNull().default(""),
    skills: text("skills").notNull().default("[]"),
    links: text("links").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("users_provider_external_idx").on(table.provider, table.externalId),
    uniqueIndex("users_email_idx").on(table.email),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    oneLiner: text("one_liner").notNull().default(""),
    problem: text("problem").notNull().default(""),
    solution: text("solution").notNull().default(""),
    stage: text("stage").notNull().default("idea"),
    progress: text("progress").notNull().default(""),
    category: text("category").notNull().default(""),
    projectUrl: text("project_url").notNull().default(""),
    projectLocation: text("project_location").notNull().default(""),
    workMode: text("work_mode").notNull().default("remote"),
    currentTeam: text("current_team").notNull().default(""),
    roleTitle: text("role_title").notNull().default(""),
    roleDescription: text("role_description").notNull().default(""),
    skillsNeeded: text("skills_needed").notNull().default("[]"),
    experienceNeeded: text("experience_needed").notNull().default(""),
    weeklyCommitment: text("weekly_commitment").notNull().default(""),
    relationship: text("relationship").notNull().default(""),
    exchangeTypes: text("exchange_types").notNull().default("[]"),
    equityMin: integer("equity_min"),
    equityMax: integer("equity_max"),
    offerDetails: text("offer_details").notNull().default(""),
    status: text("status").notNull().default("draft"),
    moderationNote: text("moderation_note").notNull().default(""),
    submittedAt: text("submitted_at"),
    reviewedAt: text("reviewed_at"),
    reviewedBy: text("reviewed_by").references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("projects_owner_idx").on(table.ownerId),
    index("projects_status_idx").on(table.status),
  ],
);

export const moderationEvents = sqliteTable(
  "moderation_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").notNull().references(() => users.id),
    action: text("action").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("moderation_project_idx").on(table.projectId)],
);
