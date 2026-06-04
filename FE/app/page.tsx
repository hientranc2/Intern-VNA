import Link from "next/link";
import { DESIGN_PAGES } from "@/libs/tts/design-pages";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            ATVSLD UI
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Bo giao dien tham khao cho Next.js
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Trang nay tong hop cau truc code va danh sach cac giao dien tham
            khao dang co trong folder design/ va PNG goc.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Cau truc chinh</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>App: dinh tuyen, layout, data fetching.</li>
              <li>libs: core, shared, tts.</li>
              <li>public: asset dung chung.</li>
              <li>src: tuy chon, de gom code neu can.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Huong dan nhanh</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Mo /mockup de xem giao dien tu HTML.</li>
              <li>Cap nhat HTML goc trong folder design/.</li>
              <li>PNG goc nam trong folder Giao dien/.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Danh sach trang HTML</h2>
            <Link
              href="/mockup"
              className="text-sm font-semibold text-blue-700"
            >
              Xem tat ca
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DESIGN_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/mockup/${page.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {page.title}
                    </h3>
                    <p className="text-sm text-slate-600">{page.description}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {page.category}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-400">
                  design/{page.sourceFile}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
