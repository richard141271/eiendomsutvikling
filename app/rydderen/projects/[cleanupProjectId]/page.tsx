import { redirect } from "next/navigation";

export default function RydderenProjectRedirect({ params }: { params: { cleanupProjectId: string } }) {
  redirect(`/dashboard/rydderen/projects/${params.cleanupProjectId}`);
}
