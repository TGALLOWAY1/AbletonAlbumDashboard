import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileBottomNav } from "@/components/mobile/bottom-nav";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { FocusSessionProvider } from "@/components/focus-session-provider";
import { FloatingFocusBar } from "@/components/floating-focus-bar";

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
        <FocusSessionProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileHeader />
              <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-7 md:pt-7">
                {children}
              </main>
            </div>
          </div>
          <MobileBottomNav />
          <FloatingFocusBar />
        </FocusSessionProvider>
      </body>
    </html>
  );
}
