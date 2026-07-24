import { SiteFooter, SiteHeader, StatusPill } from "../components";
import { requireAdmin } from "../lib/auth";
import { pendingProjects } from "../lib/projects";
import AdminReview from "./AdminReview";

export const metadata = { title: "Review Queue" };
export const dynamic = "force-dynamic";

function list(value: string) {
  try {
    return JSON.parse(value || "[]") as string[];
  } catch {
    return [];
  }
}

export default async function Admin() {
  const user = await requireAdmin("/admin");
  const projects = await pendingProjects();
  return (
    <>
      <SiteHeader user={user} />
      <main className="admin-page shell">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Private review queue</p>
            <h1>Trust and completeness<span>.</span></h1>
            <p>Review the invitation, not the market taste. Approve listings that are genuine, clear, and respectful.</p>
          </div>
          <div className="queue-count"><strong>{projects.filter((p) => p.status === "pending").length}</strong><span>awaiting review</span></div>
        </header>
        <div className="review-list">
          {projects.map((project) => (
            <article className="review-card" key={project.id}>
              <div className="review-card-head">
                <div>
                  <span className="preview-stage">{project.stage} · {project.category || "uncategorized"}</span>
                  <h2>{project.title || "Untitled project"}</h2>
                  <p>{project.one_liner}</p>
                </div>
                <StatusPill status={project.status} />
              </div>
              <div className="review-columns">
                <section>
                  <span>Project</span>
                  <h3>The problem</h3>
                  <p>{project.problem || "Not supplied."}</p>
                  <h3>The approach</h3>
                  <p>{project.solution || "Not supplied."}</p>
                  <h3>Evidence</h3>
                  <p>{project.progress || "Not supplied."}</p>
                </section>
                <section>
                  <span>Cofounder invitation</span>
                  <h3>{project.role_title || "Role not named"}</h3>
                  <p>{project.role_description || "Not supplied."}</p>
                  <div className="preview-tags">{list(project.skills_needed).map((skill) => <span key={skill}>{skill}</span>)}</div>
                  <h3>Exchange</h3>
                  <div className="preview-tags">{list(project.exchange_types).map((type) => <span className="offer-tag" key={type}>{type}</span>)}</div>
                  <p>{project.offer_details || "Not supplied."}</p>
                </section>
              </div>
              <div className="review-owner">
                <strong>{project.owner_name}</strong>
                <span>{project.owner_email}</span>
                <span>{project.weekly_commitment}</span>
                <span>{project.relationship}</span>
              </div>
              {project.moderation_note && <div className="inline-review-note"><strong>Current note:</strong> {project.moderation_note}</div>}
              <AdminReview projectId={project.id} />
            </article>
          ))}
          {!projects.length && (
            <section className="empty-state">
              <p className="eyebrow">Queue clear</p>
              <h2>Every invitation has been read.</h2>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
