"use client";

import { createContext, useContext } from "react";
import {
  defineAbilityFor,
  type AppAbility,
  type AppAction,
  type AppSubject,
} from "./ability";

// Ability rỗng mặc định (chưa load quyền) — không cho phép gì.
const emptyAbility = defineAbilityFor([]);

export const AbilityContext = createContext<AppAbility>(emptyAbility);

export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}

// Tiện ích: kiểm tra nhanh trong logic component / disable nút.
export function useCan(action: AppAction, subject: AppSubject): boolean {
  return useAbility().can(action, subject);
}
