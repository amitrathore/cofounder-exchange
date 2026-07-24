import Link from "next/link";
import { SiteFooter, SiteHeader, StatusPill } from "../components";
import { requireUser } from "../lib/auth";
import { projectsForOwner } from "../lib/projects";

export const metadata = { title: "Your Projects" };
export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  saved: "Draft saved. You can return whenever the next sentence becomes clear.",
  submitted: "Your listing is in review. We will check it for trust and completeness.",
  "admin-required": "That review space is restricted to Exchange moderators.",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [user, query] = await Promise.all([requireUser("/dashboard"), searchParams]);
  const projects = await projectsForOwner(user.id);
  return (
    <>
      <SiteHeader user={user} />
      <main className="dashboard-page shell">
        {query.notice && notices[query.notice] && (
          <div className="dashboard-notice" role="status">{notices[query.notice]}</div>
        )}
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Your exchange</p>
            <h1>Projects worth finding people for<span>.</span></h1>
            <p>{user.full_name} · {user.email}</p>
          </div>
          <Link href="/list-project" className="button button-primary">List another project →</Link>
        </header>

        {projects.length ? (
          <div className="project-list">
            {projects.map((project) => (
              <article key={project.id} className="project-row">
                <div className="project-number">{project.title.slice(0, 2).toUpperCase() || "—"}</div>
                <div className="project-main">
                  <div className="project-title-line">
                    <h2>{project.title || "Untitled project"}</h2>
                    <StatusPill status={project.status} />
                  </div>
                  <p>{project.one_liner || "This draft is waiting for its one-line description."}</p>
                  {project.moderation_note && (
                    <div className="inline-review-note">
                      <strong>Review note:</strong> {project.moderation_note}
                    </div>
                  )}
                  <div className="project-meta">
                    <span>{project.role_title || "Role not set"}</span>
                    <span>{project.work_mode}</span>
                    <span>Updated {new Date(project.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <Link href={`/projects/${project.id}/edit`} className="row-link">
                  {project.status === "changes_requested" ? "Revise" : "Edit"} <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-state">
            <p className="eyebrow">No projects yet</p>
            <h2>The next cofounder cannot find an invitation you have not written.</h2>
            <p>Start with the problem. Save a draft before you have every answer.</p>
            <Link href="/list-project" className="button button-primary">List your first project →</Link>
          </section>
        )}

        <div className="dashboard-footer">
          <p>Signed in through Intergraph.</p>
          <a href="/auth/logout">Log out</a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
