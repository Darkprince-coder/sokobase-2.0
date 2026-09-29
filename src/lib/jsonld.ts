import { site } from "./site";

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${site.url}/#org`, name: site.name, url: site.url, logo: `${site.url}/icons/icon-512.png` },
    {
      "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: site.name, inLanguage: "en-KE",
      publisher: { "@id": `${site.url}/#org` },
      potentialAction: { "@type": "SearchAction", target: `${site.url}/products?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
  ],
};

export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
