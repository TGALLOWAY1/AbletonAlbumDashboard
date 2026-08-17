import { notFound } from "next/navigation";
import { CollectionDetailView } from "@/components/library/collection-detail-view";
import { loadCollectionDetail } from "@/lib/data/library-source";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadCollectionDetail(id);
  if (!detail) notFound();

  return <CollectionDetailView detail={detail} />;
}
