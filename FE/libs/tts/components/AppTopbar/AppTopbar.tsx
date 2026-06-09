type AppTopbarProps = {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
};

export function AppTopbar({ onToggleSidebar, sidebarCollapsed }: AppTopbarProps) {
  if (!sidebarCollapsed) return null;

  return (
    <header className="fixed left-0 right-0 top-0 z-100 flex h-13 items-center bg-dark px-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex flex-col gap-1.25 p-1 opacity-70 hover:opacity-100"
        aria-label="Mở menu"
      >
        <span className="block h-0.5 w-5.5 rounded bg-white" />
        <span className="block h-0.5 w-5.5 rounded bg-white" />
        <span className="block h-0.5 w-5.5 rounded bg-white" />
      </button>
    </header>
  );
}
