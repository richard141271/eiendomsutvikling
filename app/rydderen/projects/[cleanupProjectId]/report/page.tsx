import { redirect } from "next/navigation";

export default function RydderenReportRedirect({ params }: { params: { cleanupProjectId: string } }) {
  redirect(`/dashboard/rydderen/projects/${params.cleanupProjectId}/report`);
}
