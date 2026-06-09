export type Role = {
  id: number;
  ma: string;
  ten: string;
  perms: string[];
};

export const INITIAL_ROLES: Role[] = [
  {
    id: 1,
    ma: "Role1",
    ten: "Manager",
    perms: [
      "ADMIN_C_DEPARTMENT_VIEW",
      "ADMIN_C_DEPARTMENT_CREATE",
      "ADMIN_C_DEPARTMENT_UPDATE",
      "ADMIN_C_DEPARTMENT_DELETE",
    ],
  },
  { id: 2, ma: "Role2", ten: "Employee", perms: ["ADMIN_C_DEPARTMENT_VIEW"] },
  {
    id: 3,
    ma: "Role3",
    ten: "CEO",
    perms: [
      "ADMIN_C_DEPARTMENT_VIEW",
      "ADMIN_C_DEPARTMENT_CREATE",
      "ADMIN_C_DEPARTMENT_UPDATE",
      "ADMIN_C_DEPARTMENT_DELETE",
      "ADMIN_C_ROLE_VIEW",
      "ADMIN_C_USER_VIEW",
    ],
  },
];
