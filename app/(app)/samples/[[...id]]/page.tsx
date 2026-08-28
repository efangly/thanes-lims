import { SamplesView } from "@/components/samples-view";

export default async function SamplesPage({ params }: { params: Promise<{ id?: string[] }> }) {
  const { id } = await params;
  return <SamplesView activeId={id?.[0]} />;
}
