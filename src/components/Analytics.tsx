import Script from "next/script";

// Google Analytics 4, loaded only after the page is fully interactive ("lazyOnload") so it never
// slows the first paint or taps on slow phones. Skipped when the ID is missing or a placeholder.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
const isRealId = /^G-[A-Z0-9]{6,12}$/.test(GA_ID) && !/^G-X+$/.test(GA_ID);

export default function Analytics() {
  if (!isRealId || process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${GA_ID}");`}
      </Script>
    </>
  );
}
