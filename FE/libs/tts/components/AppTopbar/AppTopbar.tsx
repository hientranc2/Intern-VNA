type AppTopbarProps = {
  orgName?: string;
};

export function AppTopbar({ orgName: _orgName }: AppTopbarProps) {
  return (
    <header className="fixed left-[220px] right-0 top-0 z-[100] flex h-[52px] items-center justify-end bg-dark px-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <button type="button" className="flex flex-col gap-[5px] p-1" aria-label="Menu">
        <span className="block h-0.5 w-[22px] rounded bg-white" />
        <span className="block h-0.5 w-[22px] rounded bg-white" />
        <span className="block h-0.5 w-[22px] rounded bg-white" />
      </button>
    </header>
  );
}
