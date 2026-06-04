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
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, #f0f8ff 0%, #ddf0fa 30%, #b8dcf5 60%, #8ec8e8 100%)",
        }}
      >
        <AuthIllustration />
      </div>

      <div
        className="flex min-w-[400px] max-w-[520px] flex-[0_0_36%] flex-col items-center justify-center bg-white px-14 py-12"
        style={{ boxShadow: "-4px 0 30px rgba(0,0,0,0.08)" }}
      >
        <div className="flex w-full max-w-[340px] flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
