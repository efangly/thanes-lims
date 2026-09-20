import { PartnerDeviceDetail } from "@/components/partner-device-detail";

export default async function PartnerDeviceDetailPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  return <PartnerDeviceDetail serial={decodeURIComponent(serial)} />;
}
