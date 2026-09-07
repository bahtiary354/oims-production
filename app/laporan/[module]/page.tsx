import { RoutedModulePage } from "../../routed-module-page";

export default function ReportRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["operasional", "keuangan", "riwayat-pembayaran"]} />;
}
