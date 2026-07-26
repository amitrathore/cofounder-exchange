import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "cofounder.exchange";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const description =
    "Make a serious invitation to build: share your project, the cofounder you need, and what you're ready to offer. The right builders can find each other.";
  return {
    metadataBase,
    applicationName: "Cofounder.Exchange",
    title: {
      default: "Cofounder.Exchange — Find the person who changes the build",
      template: "%s · Cofounder.Exchange",
    },
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Find the person who changes the build.",
      description,
      type: "website",
      siteName: "Cofounder.Exchange",
      locale: "en_US",
      images: [
        {
          url: "/og-v2.png",
          width: 1200,
          height: 630,
          alt: "Cofounder.Exchange — Find the person who changes the build.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Find the person who changes the build.",
      description,
      images: ["/og-v2.png"],
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
