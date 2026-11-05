import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@/lib/i18n";
import { env } from "@/lib/env";

const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", variable: "--font-geist-mono" });
/* Amharic. Not preloaded: only downloaded when Ethiopic text is on the page. */
const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-ethiopic",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return {
    metadataBase: new URL(env.SITE_URL()),
    title: { default: `${t.site.name} · ${t.site.tagline}`, template: `%s · ${t.site.name}` },
    description: t.site.description,
    openGraph: { siteName: t.site.name, type: "website", locale: "en_ET" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b12" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <html lang={locale} className={`${geist.variable} ${geistMono.variable} ${ethiopic.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-white"
        >
          {t.nav.skip}
        </a>
        <Header t={t} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
          {children}
        </main>
        <Footer t={t} locale={locale} />
      </body>
    </html>
  );
}
