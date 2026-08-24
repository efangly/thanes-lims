import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";

const title = "Thanes LIMS — ระบบบริหารจัดการข้อมูลห้องปฏิบัติการ";
const description =
  "Laboratory Information Management System · จัดการตัวอย่าง เครื่องมือ สภาพแวดล้อม คงคลัง เอกสาร และการทดสอบ";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title,
  description,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/images/meta/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/meta/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/images/meta/favicon.ico",
    apple: "/images/meta/apple-touch-icon-180x180.png",
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Thanes LIMS",
    images: [
      {
        url: "/images/meta/thanes-og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/meta/thanes-og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1219" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
