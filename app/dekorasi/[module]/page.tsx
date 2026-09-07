import { RoutedModulePage } from "../../routed-module-page";

export default function DecorationRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["sablon-bordir"]} />;
}
