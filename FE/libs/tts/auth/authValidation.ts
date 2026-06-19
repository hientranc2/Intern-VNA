export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginField = "username" | "password" | null;

export type LoginError = {
  field: LoginField;
  message: string;
};

export function validateLogin(
  username: string,
  password: string,
): LoginError | null {
  if (!username) {
    return { field: "username", message: "Vui lòng nhập đầy đủ thông tin" };
  }
  if (!password) {
    return { field: "password", message: "Vui lòng nhập đầy đủ thông tin" };
  }
  return null;
}

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// SĐT Việt Nam: 10–11 chữ số bắt đầu bằng 0, hoặc +84... (bỏ qua dấu cách/chấm/gạch).
export const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.replace(/[\s.-]/g, ""));
}

// Mật khẩu mạnh: tối thiểu 8 ký tự, có chữ hoa, chữ thường và ký tự đặc biệt.
export const PASSWORD_REGEX = /^\S{8,}$/;
export const PASSWORD_RULE_MESSAGE =
  "Mật khẩu tối thiểu 8 ký tự và không chứa khoảng trắng";

export function isStrongPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
