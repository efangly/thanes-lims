import { SamplesView } from "@/components/samples-view";

export default async function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SamplesView activeId={id} />;
}
