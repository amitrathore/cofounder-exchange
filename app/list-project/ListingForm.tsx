"use client";

import { useMemo, useState } from "react";

type FounderDraft = {
  fullName: string;
  avatarUrl: string;
  location: string;
  timezone: string;
  bio: string;
  skills: string[];
  links: string[];
};

type ProjectDraft = {
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
  status?: string;
  moderationNote?: string;
};

const emptyProject: ProjectDraft = {
  title: "",
  oneLiner: "",
  problem: "",
  solution: "",
  stage: "idea",
  progress: "",
  category: "",
  projectUrl: "",
  projectLocation: "",
  workMode: "remote",
  currentTeam: "",
  roleTitle: "",
  roleDescription: "",
  skillsNeeded: [],
  experienceNeeded: "",
  weeklyCommitment: "",
  relationship: "",
  exchangeTypes: [],
  equityMin: null,
  equityMax: null,
  offerDetails: "",
};

const steps = ["You", "Project", "Cofounder", "Exchange", "Review"];
const exchangeOptions = ["Equity", "Cash", "Revenue share", "Skill swap", "Open to discuss"];

function ListField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        value={value.join(", ")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        placeholder={hint}
      />
      <small>Separate entries with commas.</small>
    </label>
  );
}

export default function ListingForm({
  founder: founderInitial,
  project: projectInitial,
  projectId,
}: {
  founder: FounderDraft;
  project?: ProjectDraft;
  projectId?: string;
}) {
  const [step, setStep] = useState(0);
  const [founder, setFounder] = useState(founderInitial);
  const [project, setProject] = useState({ ...emptyProject, ...projectInitial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [trustConfirmed, setTrustConfirmed] = useState(false);

  const previewSkills = useMemo(() => project.skillsNeeded.slice(0, 4), [project.skillsNeeded]);

  function founderField<K extends keyof FounderDraft>(key: K, value: FounderDraft[K]) {
    setFounder((current) => ({ ...current, [key]: value }));
  }

  function projectField<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  async function save(intent: "draft" | "submit") {
    setSaving(intent);
    setErrors({});
    try {
      const response = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ founder, project, intent, trustConfirmed }),
      });
      const result = (await response.json()) as {
        id?: string;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!response.ok) {
        setErrors(result.errors ?? { form: result.error ?? "We could not save the listing." });
        if (result.errors) setStep(4);
        return;
      }
      window.location.href = `/dashboard?notice=${intent === "submit" ? "submitted" : "saved"}`;
    } catch {
      setErrors({ form: "The connection was interrupted. Your browser still has the form; please try again." });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="listing-builder">
      <ol className="step-nav" aria-label="Listing sections">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className={index === step ? "active" : ""}
              aria-current={index === step ? "step" : undefined}
              onClick={() => setStep(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {Object.keys(errors).length > 0 && (
        <div className="error-summary" role="alert">
          <strong>The listing needs a little more clarity.</strong>
          <ul>{Object.values(errors).map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}

      <form onSubmit={(event) => event.preventDefault()}>
        {step === 0 && (
          <section className="form-section">
            <div className="form-heading">
              <p className="eyebrow">01 / You</p>
              <h2>Who is opening this invitation?</h2>
              <p>Your founder profile will appear with every approved project. Your email remains private.</p>
            </div>
            <div className="field-grid">
              <label>
                <span>Full name</span>
                <input value={founder.fullName} onChange={(e) => founderField("fullName", e.target.value)} autoComplete="name" />
              </label>
              <label>
                <span>Profile image URL <em>Optional</em></span>
                <input value={founder.avatarUrl} onChange={(e) => founderField("avatarUrl", e.target.value)} inputMode="url" placeholder="https://" />
              </label>
              <label>
                <span>Location</span>
                <input value={founder.location} onChange={(e) => founderField("location", e.target.value)} placeholder="San Francisco, CA" />
              </label>
              <label>
                <span>Time zone</span>
                <input value={founder.timezone} onChange={(e) => founderField("timezone", e.target.value)} placeholder="Pacific Time / UTC−8" />
              </label>
              <label className="field-full">
                <span>Short founder bio</span>
                <textarea value={founder.bio} onChange={(e) => founderField("bio", e.target.value)} rows={5} placeholder="What have you built, learned, or become unusually good at?" />
              </label>
              <ListField label="Your skills" value={founder.skills} onChange={(value) => founderField("skills", value)} hint="Product, AI, sales, design" />
              <ListField label="Professional links" value={founder.links} onChange={(value) => founderField("links", value)} hint="https://linkedin.com/in/…, https://github.com/…" />
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="form-section">
            <div className="form-heading">
              <p className="eyebrow">02 / Project</p>
              <h2>Make the project legible.</h2>
              <p>Enough context for another serious builder to decide whether they want the next conversation.</p>
            </div>
            <div className="field-grid">
              <label>
                <span>Project name</span>
                <input value={project.title} onChange={(e) => projectField("title", e.target.value)} placeholder="A name people can remember" />
              </label>
              <label>
                <span>Category</span>
                <input value={project.category} onChange={(e) => projectField("category", e.target.value)} placeholder="Climate, developer tools, health…" />
              </label>
              <label className="field-full">
                <span>One-line description</span>
                <input value={project.oneLiner} onChange={(e) => projectField("oneLiner", e.target.value)} placeholder="We help [people] accomplish [outcome] by [approach]." />
              </label>
              <label className="field-full">
                <span>The problem</span>
                <textarea value={project.problem} onChange={(e) => projectField("problem", e.target.value)} rows={5} placeholder="Who experiences it, what happens today, and why is it worth solving?" />
              </label>
              <label className="field-full">
                <span>Your approach</span>
                <textarea value={project.solution} onChange={(e) => projectField("solution", e.target.value)} rows={5} placeholder="What are you building, and what is different about your point of view?" />
              </label>
              <label>
                <span>Stage</span>
                <select value={project.stage} onChange={(e) => projectField("stage", e.target.value)}>
                  <option value="idea">Clear idea</option>
                  <option value="validation">Validating</option>
                  <option value="prototype">Prototype</option>
                  <option value="launched">Launched</option>
                  <option value="revenue">Revenue</option>
                </select>
              </label>
              <label>
                <span>Project URL <em>Optional</em></span>
                <input value={project.projectUrl} onChange={(e) => projectField("projectUrl", e.target.value)} inputMode="url" placeholder="https://" />
              </label>
              <label className="field-full">
                <span>Evidence and progress</span>
                <textarea value={project.progress} onChange={(e) => projectField("progress", e.target.value)} rows={4} placeholder="Research, users, prototype, revenue, hard-won insight—what exists today?" />
              </label>
              <label>
                <span>Project location</span>
                <input value={project.projectLocation} onChange={(e) => projectField("projectLocation", e.target.value)} placeholder="Global, New York, Europe…" />
              </label>
              <label>
                <span>Working mode</span>
                <select value={project.workMode} onChange={(e) => projectField("workMode", e.target.value)}>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="in-person">In person</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className="field-full">
                <span>Current team <em>Optional</em></span>
                <textarea value={project.currentTeam} onChange={(e) => projectField("currentTeam", e.target.value)} rows={3} placeholder="Who is already involved and what do they own?" />
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="form-section">
            <div className="form-heading">
              <p className="eyebrow">03 / Cofounder</p>
              <h2>Name the missing person.</h2>
              <p>A role is more than a title. Describe the work, judgment, rhythm, and commitment the partnership needs.</p>
            </div>
            <div className="field-grid">
              <label>
                <span>Role title</span>
                <input value={project.roleTitle} onChange={(e) => projectField("roleTitle", e.target.value)} placeholder="Technical cofounder, clinical lead…" />
              </label>
              <label>
                <span>Weekly commitment</span>
                <input value={project.weeklyCommitment} onChange={(e) => projectField("weeklyCommitment", e.target.value)} placeholder="10–15 hours now; full-time after funding" />
              </label>
              <label className="field-full">
                <span>What this person will own</span>
                <textarea value={project.roleDescription} onChange={(e) => projectField("roleDescription", e.target.value)} rows={6} placeholder="The decisions, work, and outcomes this cofounder would lead." />
              </label>
              <ListField label="Skills needed" value={project.skillsNeeded} onChange={(value) => projectField("skillsNeeded", value)} hint="Full-stack engineering, ML systems, fundraising" />
              <label>
                <span>Working relationship</span>
                <input value={project.relationship} onChange={(e) => projectField("relationship", e.target.value)} placeholder="Equal partner, domain cofounder…" />
              </label>
              <label className="field-full">
                <span>Experience and qualities</span>
                <textarea value={project.experienceNeeded} onChange={(e) => projectField("experienceNeeded", e.target.value)} rows={4} placeholder="What would make someone unusually suited to this build?" />
              </label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="form-section">
            <div className="form-heading">
              <p className="eyebrow">04 / Exchange</p>
              <h2>Put the offer on the table.</h2>
              <p>This is not a contract. It is a clear, honest starting point for the conversation.</p>
            </div>
            <fieldset className="choice-field">
              <legend>What are you open to offering?</legend>
              <div className="choice-grid">
                {exchangeOptions.map((option) => (
                  <label key={option} className={project.exchangeTypes.includes(option) ? "selected" : ""}>
                    <input
                      type="checkbox"
                      checked={project.exchangeTypes.includes(option)}
                      onChange={(event) =>
                        projectField(
                          "exchangeTypes",
                          event.target.checked
                            ? [...project.exchangeTypes, option]
                            : project.exchangeTypes.filter((item) => item !== option),
                        )
                      }
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
            {project.exchangeTypes.includes("Equity") && (
              <div className="field-grid equity-fields">
                <label>
                  <span>Equity range minimum (%) <em>Optional</em></span>
                  <input type="number" min="0" max="100" value={project.equityMin ?? ""} onChange={(e) => projectField("equityMin", e.target.value === "" ? null : Number(e.target.value))} />
                </label>
                <label>
                  <span>Equity range maximum (%) <em>Optional</em></span>
                  <input type="number" min="0" max="100" value={project.equityMax ?? ""} onChange={(e) => projectField("equityMax", e.target.value === "" ? null : Number(e.target.value))} />
                </label>
              </div>
            )}
            <label className="standalone-field">
              <span>Explain the proposed exchange</span>
              <textarea value={project.offerDetails} onChange={(e) => projectField("offerDetails", e.target.value)} rows={7} placeholder="What can you offer now? What would change with milestones, funding, or a full-time commitment?" />
            </label>
            <div className="legal-note">
              <strong>Clarity, not certainty.</strong>
              <p>Final ownership and compensation belong in a proper founder agreement with independent legal advice.</p>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="form-section">
            <div className="form-heading">
              <p className="eyebrow">05 / Review</p>
              <h2>Read it as your future cofounder would.</h2>
              <p>Submitted listings are reviewed for trust and completeness—not whether the idea fits someone else’s taste.</p>
            </div>
            <article className="listing-preview">
              <div className="preview-top">
                <div>
                  <span className="preview-stage">{project.stage}</span>
                  <h3>{project.title || "Untitled project"}</h3>
                  <p>{project.oneLiner || "Your one-line project description will appear here."}</p>
                </div>
                <span className="preview-mode">{project.workMode}</span>
              </div>
              <div className="preview-role">
                <span>Looking for</span>
                <strong>{project.roleTitle || "A cofounder"}</strong>
                <p>{project.roleDescription || "The role and ownership will appear here."}</p>
              </div>
              <div className="preview-tags">
                {previewSkills.map((skill) => <span key={skill}>{skill}</span>)}
                {project.exchangeTypes.map((type) => <span key={type} className="offer-tag">{type}</span>)}
              </div>
              <div className="preview-founder">
                <span className="avatar-placeholder">{founder.fullName.slice(0, 1) || "C"}</span>
                <div><strong>{founder.fullName || "Your name"}</strong><small>{founder.location || "Your location"} · {founder.timezone || "Time zone"}</small></div>
              </div>
            </article>
            {project.moderationNote && (
              <div className="review-note">
                <strong>Review note</strong>
                <p>{project.moderationNote}</p>
              </div>
            )}
            <label className="trust-check">
              <input type="checkbox" checked={trustConfirmed} onChange={(event) => setTrustConfirmed(event.target.checked)} />
              <span>I am representing this project honestly and understand that contact details remain private.</span>
            </label>
          </section>
        )}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => save("draft")} disabled={saving !== null}>
            {saving === "draft" ? "Saving…" : "Save draft"}
          </button>
          <div>
            {step > 0 && <button type="button" className="text-button" onClick={() => setStep(step - 1)}>← Back</button>}
            {step < 4 ? (
              <button type="button" className="button button-primary" onClick={() => setStep(step + 1)}>Continue →</button>
            ) : (
              <button type="button" className="button button-primary" onClick={() => save("submit")} disabled={saving !== null}>
                {saving === "submit" ? "Submitting…" : "Submit for review →"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
