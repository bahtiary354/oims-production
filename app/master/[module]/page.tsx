import { RoutedModulePage } from "../../routed-module-page";

export default function MasterRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["jaket", "vendor", "qc", "pic"]} />;
}
