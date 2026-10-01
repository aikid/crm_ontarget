import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "./components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-platform.png`;

  return {
    title: "OnTarget | Operação e Portal do Cliente",
    description:
      "Operação SDR e resultados de campanhas automotivas conectados em uma única plataforma.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "OnTarget | Operação e Portal do Cliente",
      description: "Operação e resultados, na mesma plataforma.",
      type: "website",
      locale: "pt_BR",
      images: [{ url: imageUrl, width: 1680, height: 945, alt: "OnTarget — Operação e resultados, na mesma plataforma" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "OnTarget | Operação e Portal do Cliente",
      description: "Operação e resultados, na mesma plataforma.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
