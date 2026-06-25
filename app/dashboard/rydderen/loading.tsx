import { AsyncState } from "@/components/ui/async-state";

export default function RydderenLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <AsyncState
        mode="loading"
        title="Apner Rydder'n"
        description="Klargjor prosjekt og arbeidsflate."
        progress={40}
      />
    </div>
  );
}
