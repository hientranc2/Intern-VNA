export const DEMO_ACCOUNT = { username: "admin", password: "123456" };

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
  if (
    username !== DEMO_ACCOUNT.username ||
    password !== DEMO_ACCOUNT.password
  ) {
    return {
      field: null,
      message: "Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại",
    };
  }
  return null;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
