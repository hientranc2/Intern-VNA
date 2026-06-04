import { GovSeal } from "@/libs/core/components/GovSeal/GovSeal";

type AppTopbarProps = {
  orgName?: string;
};

export function AppTopbar({ orgName = "Ủy ban nhân dân tỉnh ABC" }: AppTopbarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-[100] flex h-[52px] items-center gap-3 bg-dark px-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <GovSeal size={34} className="shrink-0" />
      <span className="flex-1 text-[13px] font-semibold text-white">{orgName}</span>
      <button type="button" className="flex flex-col gap-[5px] p-1" aria-label="Menu">
        <span className="block h-0.5 w-[22px] rounded bg-white" />
        <span className="block h-0.5 w-[22px] rounded bg-white" />
        <span className="block h-0.5 w-[22px] rounded bg-white" />
      </button>
    </header>
  );
}
