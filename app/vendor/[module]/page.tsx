import { RoutedModulePage } from "../../routed-module-page";

export default function VendorRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["pengiriman", "penerimaan"]} />;
}
