"use client";

type DesignFrameProps = {
  html: string;
  title: string;
};

/**
 * Render HTML mockup tĩnh trong iframe để cô lập global scope.
 * Mỗi mockup có <script> khai báo biến/hàm global riêng (handleLogin, users...);
 * nếu inject thẳng vào document chung thì khai báo `const`/`let` sẽ va chạm khi
 * effect chạy lại (StrictMode) hoặc khi chuyển trang. Iframe cho mỗi mockup một
 * window riêng nên không còn va chạm, mà onclick inline vẫn hoạt động.
 */
export function DesignFrame({ html, title }: DesignFrameProps) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
      className="h-screen w-full border-0"
    />
  );
}
