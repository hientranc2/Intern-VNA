import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { DesignFrame } from "@/libs/core/components/DesignFrame/DesignFrame";
import { DESIGN_PAGE_BY_SLUG, DESIGN_PAGES } from "@/libs/tts/design-pages";

export const dynamicParams = false;

export async function generateStaticParams() {
  return DESIGN_PAGES.map((page) => ({ page: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageInfo = DESIGN_PAGE_BY_SLUG[page];

  if (!pageInfo) {
    return { title: "Design page" };
  }

  return {
    title: `${pageInfo.title} | Design`,
  };
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageInfo = DESIGN_PAGE_BY_SLUG[page];

  if (!pageInfo) {
    notFound();
  }

  const filePath = path.join(process.cwd(), "design", pageInfo.sourceFile);
  const rawHtml = await readFile(filePath, "utf-8");

  return (
    <div className="min-h-screen bg-slate-50">
      <DesignFrame html={rawHtml} title={pageInfo.title} />
    </div>
  );
}
