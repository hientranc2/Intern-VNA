import Link from "next/link";
import { DESIGN_PAGES } from "@/libs/tts/design-pages";

export const metadata = {
  title: "Design pages",
};

export default function DesignIndexPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Design
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Danh sach trang tham khao
          </h1>
          <p className="text-base text-slate-600">
            Cac trang nay duoc render truc tiep tu folder design/ de doi chieu
            voi PNG goc.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {DESIGN_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/mockup/${page.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {page.title}
                  </h2>
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
        </section>
      </main>
    </div>
  );
}
