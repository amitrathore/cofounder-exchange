import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components";
import { getCurrentUser } from "../lib/auth";

export const metadata = { title: "Explore Projects" };
export const dynamic = "force-dynamic";

export default async function Explore() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader user={user} />
      <main className="coming-page shell">
        <p className="eyebrow">Looking for cofounders / 02</p>
        <h1>Explore projects is coming next<span>.</span></h1>
        <p>
          The first founders are writing the invitations now. Soon you will be able to search by project, role,
          contribution, location, and kind of exchange—then send a private, thoughtful expression of interest.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/list-project">List your project first</Link>
          <Link className="button button-secondary" href="/">Back to the Exchange</Link>
        </div>
        <div className="coming-index">
          <div><span>01</span><strong>List your project</strong><small>Live first</small></div>
          <div><span>02</span><strong>Explore projects</strong><small>Coming next</small></div>
          <div><span>03</span><strong>The Market</strong><small>Later</small></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
