import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-slate-900">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          404
        </p>
        <h1 className="text-2xl font-semibold">Khong tim thay trang</h1>
      </div>
      <Link
        href="/mockup"
        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
      >
        Quay lai danh sach
      </Link>
    </div>
  );
}
