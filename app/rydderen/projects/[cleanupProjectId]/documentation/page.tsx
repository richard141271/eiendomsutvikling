import { RydderenDocumentationPage } from "@/src/modules/rydderen/pages";

export default function RydderenDocumentationRoute({ params }: { params: { cleanupProjectId: string } }) {
  return <RydderenDocumentationPage cleanupProjectId={params.cleanupProjectId} basePath="/rydderen" />;
}
