import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";

// Hành động khớp với hậu tố mã quyền BE: SO_C_<MODULE>_<ACTION>
export type AppAction = "view" | "create" | "update" | "delete";

// Mỗi MODULE trong cây quyền là một subject của CASL.
export type AppSubject =
  | "PERMISSION"
  | "ROLE"
  | "USER"
  | "ENTERPRISE_TYPE"
  | "BUSINESS_SECTOR"
  | "ENTERPRISE"
  | "REPORT_CONFIG"
  | "CATEGORY"
  | "ACCIDENT_REPORT"
  | "SIGN_REPORT"
  | "all";

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

const ACTION_BY_SUFFIX: Record<string, AppAction> = {
  VIEW: "view",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
};

// Tách mã quyền "SO_C_ENTERPRISE_TYPE_VIEW" -> { subject: "ENTERPRISE_TYPE", action: "view" }
export function parsePermissionCode(
  code: string,
): { subject: AppSubject; action: AppAction } | null {
  const match = code.match(/^SO_C_(.+)_(VIEW|CREATE|UPDATE|DELETE)$/);
  if (!match) return null;
  return {
    subject: match[1] as AppSubject,
    action: ACTION_BY_SUFFIX[match[2]],
  };
}

// Dựng CASL ability từ danh sách mã quyền của user.
export function defineAbilityFor(perms: string[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const code of perms) {
    const parsed = parsePermissionCode(code);
    if (parsed) can(parsed.action, parsed.subject);
  }
  return build();
}

// Map route (Role Sở) -> subject để lọc menu sidebar theo quyền "view".
// Route không có trong map (vd /sign-report, /account) không bị chặn.
export const SUBJECT_BY_PATH: Record<string, AppSubject> = {
  "/permission": "PERMISSION",
  "/role": "ROLE",
  "/user": "USER",
  "/enterprise-type": "ENTERPRISE_TYPE",
  "/business-sector": "BUSINESS_SECTOR",
  "/enterprise": "ENTERPRISE",
  "/report-config": "REPORT_CONFIG",
  "/category": "CATEGORY",
  "/accident-report": "ACCIDENT_REPORT",
  "/sign-report": "SIGN_REPORT",
};
