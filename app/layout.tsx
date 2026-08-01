import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "Oims — Production Management",
    description: "Dashboard posisi fisik produksi jaket dari cutting hingga stok barang jadi.",
    icons: { icon: "/oims-logo.jpg" },
    openGraph: { title: "Oims Production Management", description: "Posisi barang produksi dalam satu tampilan yang jelas.", images: [image] },
    twitter: { card: "summary_large_image", title: "Oims Production Management", description: "Posisi barang produksi dalam satu tampilan yang jelas.", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
