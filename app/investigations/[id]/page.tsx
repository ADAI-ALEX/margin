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

/** Designed loading state: the page frame and a quiet status line (shown only for ids outside the prerendered list). */
function DossierLoading() {
  return (
    <main id="main" className="ui-page" aria-busy="true">
      <header className="ui-page-head">
        <p className="caps">Investigation dossier</p>
        <h1 className="ui-page-title">Loading dossier…</h1>
        <p className="ui-page-lede" role="status">Reading the record, its runs and their sources.</p>
      </header>
    </main>
  );
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
    <Suspense fallback={<DossierLoading />}>
      <DossierFor params={params} />
    </Suspense>
  );
}
