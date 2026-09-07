import { RoutedModulePage } from "../../routed-module-page";

export default function QualityControlRoute({ params }: { params: Promise<{ module: string }> }) {
  return <RoutedModulePage params={params} allowed={["pengiriman", "pemeriksaan", "rework", "penerimaan-rework", "ulang", "karantina-reject"]} />;
}
