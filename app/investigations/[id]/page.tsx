import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_INVESTIGATIONS, invById } from "@/lib/data";
import { Dossier } from "@/components/dossier/Dossier";

/** One statically generated dossier per investigation (24 PSI records + published/planned groups). */
export function generateStaticParams() {
  return ALL_INVESTIGATIONS.map((inv) => ({ id: inv.id }));
}

export async function generateMetadata({ params }: PageProps<"/investigations/[id]">): Promise<Metadata> {
  const { id } = await params;
  const inv = invById.get(decodeURIComponent(id));
  if (!inv) return { title: "Investigation not found", robots: { index: false } };
  return {
    title: inv.title !== inv.acronym ? `${inv.acronym}: ${inv.title}` : inv.acronym,
    description: `Dossier for ${inv.acronym} (${inv.id}): record metadata, computed fingerprint, run table with normalized and original values, and sources. Evidence proximity, not a safety rating.`,
  };
}

async function DossierFor({ params }: { params: PageProps<"/investigations/[id]">["params"] }) {
  const { id } = await params;
  const inv = invById.get(decodeURIComponent(id));
  if (!inv) notFound();
  return <Dossier id={inv.id} />;
}

// Params are URL data under Cache Components: read them inside a Suspense boundary. Every known id is
// prerendered by generateStaticParams, so the fallback only shows for ids outside the list (which 404).
export default function Page({ params }: PageProps<"/investigations/[id]">) {
  return (
    <Suspense fallback={<main id="main" style={{ padding: "24px var(--gutter)" }}><p>Loading dossier…</p></main>}>
      <DossierFor params={params} />
    </Suspense>
  );
}
