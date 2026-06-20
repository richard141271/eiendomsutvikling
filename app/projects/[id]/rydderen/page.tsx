import { redirect } from "next/navigation";

export default function ProjectRydderenEntry({ params }: { params: { id: string } }) {
  redirect(`/dashboard/rydderen/projects?contextType=project&contextId=${params.id}`);
}
