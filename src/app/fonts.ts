import localFont from "next/font/local";

/** Self-hosted (from @fontsource) so builds never depend on a font CDN. */
export const newsreader = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2", style: "italic" },
  ],
  variable: "--font-newsreader",
  weight: "200 800",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const instrument = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wdth-normal.woff2", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wdth-italic.woff2", style: "italic" },
  ],
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
