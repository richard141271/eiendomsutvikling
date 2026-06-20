import { getCleanupContextOptions } from "@/src/modules/rydderen/services";
import { RydderenProjectListPage } from "@/src/modules/rydderen/pages";

export default async function RydderenProjectsPage({
  searchParams,
}: {
  searchParams?: { contextType?: string; contextId?: string };
}) {
  const contextOptions = await getCleanupContextOptions();

  return (
    <RydderenProjectListPage
      basePath="/dashboard/rydderen"
      contextOptions={contextOptions}
      initialContextType={(searchParams?.contextType as any) || null}
      initialContextId={searchParams?.contextId || null}
    />
  );
}
