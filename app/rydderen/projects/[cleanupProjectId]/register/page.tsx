import { redirect } from "next/navigation";

export default function RydderenRegisterRedirect({ params }: { params: { cleanupProjectId: string } }) {
  redirect(`/dashboard/rydderen/projects/${params.cleanupProjectId}/register`);
}
