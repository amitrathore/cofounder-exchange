import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components";
import { getCurrentUser } from "./lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  return (
    <>
      <SiteHeader user={user} />
      <main>
        {query.auth && (
          <div className="notice-bar" role="status">
            {query.auth === "unavailable"
              ? "Intergraph login is being connected. The public site is ready; account access will open once identity credentials are configured."
              : "We could not complete that login safely. Please begin again from Cofounder.Exchange."}
          </div>
        )}
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">Looking for cofounders / 01</p>
            <h1>
              Find the person who changes the build<span>.</span>
            </h1>
            <div className="red-rule" />
            <p className="hero-lede">
              List what you are building, who you need beside you, and what you are ready to offer in exchange.
            </p>
            <div className="hero-actions">
              <Link href="/list-project" className="button button-primary">
                List your project <i aria-hidden="true">→</i>
              </Link>
              <Link href="/explore" className="button button-secondary">
                Explore is coming next
              </Link>
            </div>
          </div>
          <aside className="exchange-card" aria-label="The exchange premise">
            <span className="card-label">Cofounder.Exchange</span>
            <div className="card-title">The right project.</div>
            <div className="card-title">The right builder.</div>
            <div className="card-rule" />
            <p>
              Not a job board. Not a networking feed. A place to make a serious invitation to build something together.
            </p>
            <div className="card-footer">
              <span>List first</span>
              <span>Match next</span>
            </div>
          </aside>
        </section>

        <section className="premise-section">
          <div className="shell split-heading">
            <div>
              <p className="eyebrow">The premise</p>
              <h2>Ideas move when the right people meet.</h2>
            </div>
            <div className="editorial-copy">
              <p>
                Most people do not need more networking. They need one clear conversation with someone whose ambition,
                judgment, and ability fit the thing they are trying to build.
              </p>
              <p>
                Cofounder.Exchange makes the invitation legible: the project, the missing role, the commitment, and the
                exchange—all in one place.
              </p>
            </div>
          </div>
        </section>

        <section className="steps-section shell">
          <div className="section-heading">
            <p className="eyebrow">How it starts</p>
            <h2>A listing built for a real conversation.</h2>
          </div>
          <div className="three-grid">
            <article>
              <span>01 / Project</span>
              <h3>Say what you are building.</h3>
              <p>Name the problem, your approach, what exists today, and why it matters now.</p>
            </article>
            <article>
              <span>02 / Person</span>
              <h3>Describe the cofounder you need.</h3>
              <p>Be specific about the role, skills, working rhythm, and level of commitment.</p>
            </article>
            <article>
              <span>03 / Exchange</span>
              <h3>Put the offer on the table.</h3>
              <p>Equity, cash, revenue share, skill swap, or an honest starting point for discussion.</p>
            </article>
          </div>
        </section>

        <section className="standard-section">
          <div className="shell standard-grid">
            <div>
              <p className="eyebrow">The standard</p>
              <h2>Clarity is the first act of partnership.</h2>
            </div>
            <ul>
              <li><strong>Real identity.</strong> Founder profiles are visible; private contact details are not.</li>
              <li><strong>Real intent.</strong> Listings explain both the contribution sought and the exchange offered.</li>
              <li><strong>Human review.</strong> We check trust and completeness, not whether your startup fits a trend.</li>
            </ul>
          </div>
        </section>

        <section className="closing shell">
          <p className="eyebrow">Open the invitation</p>
          <h2>You do not need a bigger network. You need the right cofounder.</h2>
          <Link href="/list-project" className="button button-primary">
            List your project <i aria-hidden="true">→</i>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
