import { AsyncState } from "@/components/ui/async-state";

export default function ProjectsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <AsyncState
        mode="loading"
        title="Laster prosjekter"
        description="Henter prosjektdata og klargjor oversikten."
        progress={35}
      />
    </div>
  );
}
