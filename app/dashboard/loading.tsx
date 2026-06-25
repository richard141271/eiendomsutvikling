import { AsyncState } from "@/components/ui/async-state";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <AsyncState
        mode="loading"
        title="Laster dashboard"
        description="Henter oversikt og klargjor siden."
        progress={35}
      />
    </div>
  );
}
