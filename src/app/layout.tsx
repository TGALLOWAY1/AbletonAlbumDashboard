import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finish Five",
  description: "Five tracks. One focus. Finish them.",
  applicationName: "Finish Five",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Finish Five",
    description: "Five tracks. One focus. Finish them.",
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "Finish Five" }],
  },
  twitter: {
    card: "summary",
    title: "Finish Five",
    description: "Five tracks. One focus. Finish them.",
    images: ["/icon.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Sidebar reads from Supabase on every render; opt the whole app out of
// static prerendering so build doesn't try to render `/_not-found` at compile
// time without DB credentials.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-4 py-4 md:px-8 md:py-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
