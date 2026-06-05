import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";

import { CapacitorDeepLinkHandler } from "@/components/capacitor-deep-link-handler";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { WidgetSyncBoot } from "@/features/android-widgets/WidgetSyncBoot";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "루나곰 캘린더 — 내 일정, 내 돈, 내 사람들",
    template: "%s · 루나곰 캘린더",
  },
  description:
    "한국인의 일정·돈·관계를 한 화면에서 관리하는 통합 캘린더 + 가계부.",
  applicationName: "루나곰 캘린더",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "루나곰",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster richColors position="top-center" />
        <Analytics />
        <ServiceWorkerRegister />
        <CapacitorDeepLinkHandler />
        <WidgetSyncBoot />
      </body>
    </html>
  );
}
