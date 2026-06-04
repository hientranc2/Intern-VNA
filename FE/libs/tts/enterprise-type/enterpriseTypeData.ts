export type EnterpriseType = {
  id: number;
  ma: string;
  ten: string;
  active: boolean;
};

export const INITIAL_ENTERPRISE_TYPES: EnterpriseType[] = [
  { id: 1, ma: "150", ten: "Doanh nghiệp tư nhân", active: true },
  { id: 2, ma: "120", ten: "Công ty TNHH", active: true },
  { id: 3, ma: "140", ten: "Công ty hợp danh", active: false },
  { id: 4, ma: "110", ten: "Doanh nghiệp nhà nước", active: true },
];
