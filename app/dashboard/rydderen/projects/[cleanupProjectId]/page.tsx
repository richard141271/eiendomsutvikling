import { RydderenProjectDetailsPage } from "@/src/modules/rydderen/pages";

export default function RydderenProjectPage({ params }: { params: { cleanupProjectId: string } }) {
  return <RydderenProjectDetailsPage cleanupProjectId={params.cleanupProjectId} basePath="/dashboard/rydderen" />;
}
