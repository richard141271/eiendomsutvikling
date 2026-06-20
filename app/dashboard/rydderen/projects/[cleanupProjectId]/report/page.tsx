import { RydderenReportPage } from "@/src/modules/rydderen/pages";

export default function RydderenReportRoute({ params }: { params: { cleanupProjectId: string } }) {
  return <RydderenReportPage cleanupProjectId={params.cleanupProjectId} basePath="/dashboard/rydderen" />;
}
