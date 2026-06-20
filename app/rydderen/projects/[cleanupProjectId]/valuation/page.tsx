import { redirect } from "next/navigation";

export default function RydderenValuationRedirect({ params }: { params: { cleanupProjectId: string } }) {
  redirect(`/dashboard/rydderen/projects/${params.cleanupProjectId}/valuation`);
}
