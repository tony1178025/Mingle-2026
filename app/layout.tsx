import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppBootstrap } from "@/components/layout/AppBootstrap";
import { WebVitalsReporter } from "@/components/layout/WebVitalsReporter";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "밍글 Mingle",
  description: "한국 타깃 프리미엄 오프라인 소셜 디스커버리 파티 플랫폼",
  applicationName: "밍글 Mingle",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "밍글"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppBootstrap />
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
