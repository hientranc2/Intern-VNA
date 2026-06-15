export type PermissionType = "Group" | "Component";

export type Permission = {
  id: string;
  type: PermissionType;
  code: string;
  name: string;
  parentId: string | null;
  stt: string;
};
