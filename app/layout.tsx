import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";

const anuphan = localFont({
  src: [
    { path: "../public/fonts/Anuphan-Thin.ttf", weight: "100", style: "normal" },
    { path: "../public/fonts/Anuphan-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "../public/fonts/Anuphan-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/Anuphan-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Anuphan-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Anuphan-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Anuphan-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-anuphan",
  display: "swap",
});

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
    <html lang="th" suppressHydrationWarning className={anuphan.variable}>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
