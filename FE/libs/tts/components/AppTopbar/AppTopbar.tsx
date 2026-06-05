type AppTopbarProps = {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
};

export function AppTopbar({ onToggleSidebar, sidebarCollapsed }: AppTopbarProps) {
  return (
    <header
      className={`fixed right-0 top-0 z-[100] flex h-[52px] items-center bg-dark px-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[left] duration-300 ${sidebarCollapsed ? "left-0" : "left-[220px]"}`}
    >
      {sidebarCollapsed ? (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex flex-col gap-[5px] p-1 opacity-70 hover:opacity-100"
          aria-label="Mở menu"
        >
          <span className="block h-0.5 w-[22px] rounded bg-white" />
          <span className="block h-0.5 w-[22px] rounded bg-white" />
          <span className="block h-0.5 w-[22px] rounded bg-white" />
        </button>
      ) : null}
    </header>
  );
}
