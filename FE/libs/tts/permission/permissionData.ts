export type PermissionType = "Group" | "Component";

export type Permission = {
  id: string;
  type: PermissionType;
  code: string;
  name: string;
  parentId: string | null;
  stt: string;
};

export const PERMISSIONS: Permission[] = [
  { id: "g1", type: "Group", code: "ADMIN_G_DEPARTMENT", name: "Department Group", parentId: null, stt: "I" },
  { id: "c1", type: "Component", code: "ADMIN_C_DEPARTMENT_VIEW", name: "View Department", parentId: "g1", stt: "1" },
  { id: "c2", type: "Component", code: "ADMIN_C_DEPARTMENT_CREATE", name: "Create Department", parentId: "g1", stt: "2" },
  { id: "c3", type: "Component", code: "ADMIN_C_DEPARTMENT_UPDATE", name: "Update Department", parentId: "g1", stt: "3" },
  { id: "c4", type: "Component", code: "ADMIN_C_DEPARTMENT_DELETE", name: "Delete Department", parentId: "g1", stt: "4" },
  { id: "g2", type: "Group", code: "ADMIN_G_ROLE", name: "Role Group", parentId: null, stt: "II" },
  { id: "c5", type: "Component", code: "ADMIN_C_ROLE_VIEW", name: "View Role", parentId: "g2", stt: "1" },
  { id: "c6", type: "Component", code: "ADMIN_C_ROLE_CREATE", name: "Create Role", parentId: "g2", stt: "2" },
  { id: "c7", type: "Component", code: "ADMIN_C_ROLE_UPDATE", name: "Update Role", parentId: "g2", stt: "3" },
  { id: "c8", type: "Component", code: "ADMIN_C_ROLE_DELETE", name: "Delete Role", parentId: "g2", stt: "4" },
  { id: "g3", type: "Group", code: "ADMIN_G_USER", name: "User Group", parentId: null, stt: "III" },
  { id: "c9", type: "Component", code: "ADMIN_C_USER_VIEW", name: "View User", parentId: "g3", stt: "1" },
  { id: "c10", type: "Component", code: "ADMIN_C_USER_CREATE", name: "Create User", parentId: "g3", stt: "2" },
  { id: "c11", type: "Component", code: "ADMIN_C_USER_UPDATE", name: "Update User", parentId: "g3", stt: "3" },
  { id: "c12", type: "Component", code: "ADMIN_C_USER_DELETE", name: "Delete User", parentId: "g3", stt: "4" },
];
