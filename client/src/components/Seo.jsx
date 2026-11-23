import { useEffect } from "react";

// Lightweight per-page SEO helper — no extra npm dependency needed.
// Sets document.title + the key <meta>/<link> tags a page needs, and
// (optionally) injects a JSON-LD structured-data script. Runs again
// whenever its props change (e.g. navigating from one brand page to
// another), and cleans up after itself on unmount.
//
// Usage:
//   <Seo
//     title="Buy PlayStation Gift Cards Online in India | GIFTKART"
//     description="Instant PlayStation (PSN) gift card codes delivered to your account. UPI & USDT accepted. 100% genuine codes."
//     path="/brand/psn"
//     noindex={false}
//     jsonLd={{ ... }}
//   />

const SITE_NAME = "GIFTKART";
const SITE_URL = "https://giftkartstore.in"; // update if the domain ever changes
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero-banner.png`;

const setMeta = (attr, key, content) => {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setLink = (rel, href) => {
  if (!href) return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const Seo = ({ title, description, path = "", noindex = false, jsonLd, ogImage }) => {
  useEffect(() => {
    const fullTitle = title ? `${title}` : `${SITE_NAME} — Gift Cards for Every Brand`;
    document.title = fullTitle;

    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    const canonicalUrl = `${SITE_URL}${path}`;
    setLink("canonical", canonicalUrl);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:image", ogImage || DEFAULT_OG_IMAGE);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage || DEFAULT_OG_IMAGE);

    // Structured data (JSON-LD) — helps Google show richer search results
    // (e.g. product price, breadcrumbs). One <script> per page, replaced
    // whenever the page changes and removed when the page unmounts.
    let script = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      if (script) document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex, jsonLd, ogImage]);

  return null;
};

export default Seo;
export { SITE_NAME, SITE_URL };
