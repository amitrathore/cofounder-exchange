import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/app/components";
import { requireUser } from "@/app/lib/auth";
import { projectForOwner, projectToForm } from "@/app/lib/projects";
import ListingForm from "@/app/list-project/ListingForm";

export const metadata = { title: "Edit Project" };
export const dynamic = "force-dynamic";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projects/${id}/edit`);
  const project = await projectForOwner(id, user.id);
  if (!project) notFound();
  return (
    <>
      <SiteHeader user={user} />
      <main className="builder-page shell">
        <header className="builder-header">
          <p className="eyebrow">Edit listing / {project.status.replaceAll("_", " ")}</p>
          <h1>Sharpen the invitation<span>.</span></h1>
          <p>Saving creates a draft. Submitting sends the updated listing back through review.</p>
        </header>
        <ListingForm
          projectId={id}
          founder={{
            fullName: user.full_name,
            avatarUrl: user.avatar_url ?? "",
            location: user.location,
            timezone: user.timezone,
            bio: user.bio,
            skills: JSON.parse(user.skills || "[]") as string[],
            links: JSON.parse(user.links || "[]") as string[],
          }}
          project={projectToForm(project)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
