import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileBottomNav } from "@/components/mobile/bottom-nav";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { FocusSessionProvider } from "@/components/focus-session-provider";
import { FloatingFocusBar } from "@/components/floating-focus-bar";
import { NavigationTracker } from "@/components/navigation-tracker";
import { ToastProvider } from "@/components/toast";
import { APP_CHROME } from "@/lib/layout-chrome";
import { cn } from "@/lib/utils";

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
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Finish Five" }],
  },
  twitter: {
    card: "summary",
    title: "Finish Five",
    description: "Five tracks. One focus. Finish them.",
    images: ["/icon.png"],
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
        <ToastProvider>
          <FocusSessionProvider>
            {/* Sidebar, header and bottom nav are all `fixed`, so they sit
                outside flow and the scrolling column reserves their space via
                APP_CHROME.contentColumn / .mainPadding. See lib/layout-chrome. */}
            <Sidebar />
            <div className={cn(APP_CHROME.contentColumn, "flex flex-col")}>
              <MobileHeader />
              <main className={cn("flex-1", APP_CHROME.mainPadding)}>
                {children}
              </main>
            </div>
            <MobileBottomNav />
            <FloatingFocusBar />
            <NavigationTracker />
          </FocusSessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
