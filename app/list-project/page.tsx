import { SiteFooter, SiteHeader } from "../components";
import { requireUser } from "../lib/auth";
import ListingForm from "./ListingForm";

export const metadata = { title: "List Your Project" };
export const dynamic = "force-dynamic";

export default async function ListProject() {
  const user = await requireUser("/list-project");
  return (
    <>
      <SiteHeader user={user} />
      <main className="builder-page shell">
        <header className="builder-header">
          <p className="eyebrow">Looking for cofounders / List your project</p>
          <h1>Write the invitation<span>.</span></h1>
          <p>Save as you go. Nothing becomes discoverable until it is complete and reviewed.</p>
        </header>
        <ListingForm
          founder={{
            fullName: user.full_name,
            avatarUrl: user.avatar_url ?? "",
            location: user.location,
            timezone: user.timezone,
            bio: user.bio,
            skills: JSON.parse(user.skills || "[]") as string[],
            links: JSON.parse(user.links || "[]") as string[],
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
