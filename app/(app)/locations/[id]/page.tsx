import { redirect } from "next/navigation";

/**
 * Legacy deep-link shape. Selection now lives in `/locations?node=<id>` on the
 * single static route so switching nodes never remounts the browser (ADR-0010,
 * same reasoning as ADR-0005 for samples).
 */
export default async function LocationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const { kind } = await searchParams;
  const q = new URLSearchParams({ node: id });
  if (kind) q.set("kind", kind);
  redirect(`/locations?${q.toString()}`);
}
