import { RydderenValuationPage } from "@/src/modules/rydderen/pages";

export default function RydderenValuationRoute({ params }: { params: { cleanupProjectId: string } }) {
  return <RydderenValuationPage cleanupProjectId={params.cleanupProjectId} basePath="/dashboard/rydderen" />;
}
