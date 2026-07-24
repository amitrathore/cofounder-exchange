import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "cofounder.exchange";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: {
      default: "Cofounder.Exchange — Find the person who changes the build",
      template: "%s · Cofounder.Exchange",
    },
    description:
      "List what you are building, the cofounder you need, and what you are ready to offer in exchange.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Cofounder.Exchange",
      description: "Great companies start when the right builders find each other.",
      type: "website",
      siteName: "Cofounder.Exchange",
      images: [{ url: "/og.png", width: 1731, height: 909, alt: "Cofounder.Exchange — Find the person who changes the build." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Cofounder.Exchange",
      description: "List your project. Find your cofounder.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
