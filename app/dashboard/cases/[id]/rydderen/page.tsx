import { redirect } from "next/navigation";

export default function CaseRydderenEntry({ params }: { params: { id: string } }) {
  redirect(`/dashboard/rydderen/projects?contextType=case&contextId=${params.id}`);
}
