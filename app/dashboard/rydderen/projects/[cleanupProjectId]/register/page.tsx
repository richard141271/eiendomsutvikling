import { RydderenRegisterPage } from "@/src/modules/rydderen/pages";

export default function RydderenRegisterRoute({ params }: { params: { cleanupProjectId: string } }) {
  return <RydderenRegisterPage cleanupProjectId={params.cleanupProjectId} basePath="/dashboard/rydderen" />;
}
