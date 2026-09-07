import { RoutedModulePage } from "../../routed-module-page";

export default function ProductionRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["order", "cutting", "bundle"]} />;
}
