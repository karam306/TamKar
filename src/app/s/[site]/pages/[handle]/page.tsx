import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { getPages, getStore } from "@/lib/data";

type Props = { params: Promise<{ site: string; handle: string }> };

async function load(site: string, handle: string) {
  const store = await getStore(site);
  if (!store) return null;
  const page = (await getPages(store.id)).find((p) => p.handle === handle);
  return page ? { store, page } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, handle } = await params;
  const r = await load(site, handle);
  return r ? { title: r.page.title, description: r.page.body.replace(/##\s*/g, "").slice(0, 160) } : {};
}

export default async function StorePage({ params }: Props) {
  const { site, handle } = await params;
  const r = await load(site, handle);
  if (!r) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl">{r.page.title}</h1>
      <RichText text={r.page.body} className="text-muted" />
    </article>
  );
}
