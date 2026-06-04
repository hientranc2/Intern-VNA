import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATVSLD UI",
  description: "Bo giao dien tham khao cho Phan mem Quan ly ATVSLD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
