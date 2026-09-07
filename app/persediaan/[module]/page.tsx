import { RoutedModulePage } from "../../routed-module-page";

export default function InventoryRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["stok-jadi"]} />;
}
