import type { ReactNode } from "react";
import { AuthIllustration } from "./AuthIllustration";

type AuthShellProps = {
  children: ReactNode;
};

/** Layout split-screen cho các trang xác thực: trái illustration, phải form. */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex h-screen w-full" style={{ background: "#f0f4f8" }}>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-white"
      >
        <AuthIllustration />
      </div>

      <div
        className="flex min-w-100 max-w-130 flex-[0_0_36%] flex-col items-center justify-center bg-white px-14 py-12"
        style={{ boxShadow: "-4px 0 30px rgba(0,0,0,0.08)" }}
      >
        <div className="flex w-full max-w-85 flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
