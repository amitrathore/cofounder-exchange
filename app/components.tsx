import Link from "next/link";
import type { SessionUser } from "./lib/auth";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="site-header">
      <div className="shell nav-shell">
        <Link href="/" className="wordmark" aria-label="Cofounder Exchange home">
          Cofounder<span>.</span><strong>Exchange</strong>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/list-project">List a Project</Link>
          <Link href="/explore">
            Explore <small>Soon</small>
          </Link>
          <span className="nav-future">
            Market <small>Soon</small>
          </span>
        </nav>
        {user ? (
          <div className="account-links">
            {user.isAdmin && <Link href="/admin">Review</Link>}
            <Link href="/dashboard" className="nav-button">
              Dashboard
            </Link>
          </div>
        ) : (
          <Link href="/auth/login?return_to=/dashboard" className="nav-button">
            Log in with Intergraph
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <div className="wordmark footer-mark">
            Cofounder<span>.</span><strong>Exchange</strong>
          </div>
          <p>Built for the people building under the new rules.</p>
        </div>
        <div className="footer-links">
          <Link href="/list-project">List a Project</Link>
          <Link href="/explore">Explore Projects</Link>
          <a href="https://cofounder.community">Cofounder.Community ↗</a>
        </div>
        <div className="footer-meta">
          <span>Private contact by design.</span>
          <span>© MMXXVI · Cofounder.Exchange</span>
        </div>
      </div>
    </footer>
  );
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  return <span className={`status-pill status-${status}`}>{label}</span>;
}
