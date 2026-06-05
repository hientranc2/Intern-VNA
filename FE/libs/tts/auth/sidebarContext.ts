import { createContext } from "react";

export type SidebarOverride = {
  userName?: string;
  initials?: string;
  avatarUrl?: string | null;
  onChangePassword?: () => void;
};

type ContextValue = {
  override: SidebarOverride;
  setOverride: (o: SidebarOverride) => void;
};

export const SidebarOverrideContext = createContext<ContextValue>({
  override: {},
  setOverride: () => {},
});
