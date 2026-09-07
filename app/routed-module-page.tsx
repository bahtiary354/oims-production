import { notFound } from "next/navigation";
import Home from "./page";

export async function RoutedModulePage({
  params,
  allowed,
}: {
  params: Promise<{ module: string }>;
  allowed: readonly string[];
}) {
  const { module } = await params;
  if (!allowed.includes(module)) notFound();
  return <Home />;
}
