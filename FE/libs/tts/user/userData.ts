export type User = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  jobTitle: string | null;
  isActive: boolean;
  dob: string | null;
  gender: string | null;
  province: string | null;
  ward: string | null;
  address: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const ROLE_OPTIONS = ["ADMIN", "USER"];
export const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];
