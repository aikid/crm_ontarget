import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

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
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "OnTarget | Operação Comercial",
    description:
      "Gestão inteligente de operações SDR, contatos, callbacks e agendamentos para o setor automotivo.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "OnTarget | Operação Comercial",
      description: "Operação comercial, agora sob controle.",
      type: "website",
      locale: "pt_BR",
      images: [{ url: imageUrl, width: 1680, height: 945, alt: "OnTarget — Operação comercial, agora sob controle" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "OnTarget | Operação Comercial",
      description: "Operação comercial, agora sob controle.",
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
        {children}
      </body>
    </html>
  );
}
