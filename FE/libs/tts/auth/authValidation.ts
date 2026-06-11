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
  return EMAIL_REGEX.test(email);
}
