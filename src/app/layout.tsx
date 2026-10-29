import type { Metadata, Viewport } from "next";
import { Masthead } from "@/components/chrome/masthead";
import { Footer } from "@/components/chrome/footer";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { CommandPalette } from "@/components/chrome/command-palette";
import { MotionProvider } from "@/components/motion/motion-provider";
import { siteUrl } from "@/lib/env";
import { instrument, newsreader } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Lede: the news, checked against itself", template: "%s | Lede" },
  description:
    "Lede groups reporting from dozens of outlets into single stories and summarises what is known, with every line linked to its source.",
  applicationName: "Lede",
  openGraph: { type: "website", siteName: "Lede", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#17191d" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Applies saved reader settings before paint so there is no flash. */
const settingsScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem('lede-theme');if(t==='light'||t==='dark')d.dataset.theme=t;var m=localStorage.getItem('lede-motion');if(m==='reduced')d.dataset.motion='reduced';var s=localStorage.getItem('lede-scale');if(s)d.style.setProperty('--reader-scale',s);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${newsreader.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: settingsScript }} />
        <noscript>
          <style>{`[style*="opacity:0"],[style*="clip-path"],[style*="translateY"]{opacity:1!important;clip-path:none!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SmoothScroll />
        <MotionProvider>
          <Masthead />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CommandPalette />
        </MotionProvider>
      </body>
    </html>
  );
}
