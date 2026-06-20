import { redirect } from "next/navigation";

export default function PropertyRydderenEntry({ params }: { params: { id: string } }) {
  redirect(`/dashboard/rydderen/projects?contextType=property&contextId=${params.id}`);
}
