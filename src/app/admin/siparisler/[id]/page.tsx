import { OrderAdminDetail } from "@/components/admin/OrderAdminDetail";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderAdminDetail orderId={id} />;
}
