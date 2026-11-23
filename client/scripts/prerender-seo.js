/* eslint-disable */
/**
 * Build-time SEO prerender for the CRA bundle.
 *
 * Why this exists
 * ---------------
 * CRA ships ONE index.html and Vercel serves it for every route. That means the
 * HTML Googlebot gets on its first (JavaScript-free) pass is identical for
 * /brand/steam, /blog and / — same <title>, same canonical. A canonical
 * pointing at the homepage on every URL tells Google "these are all duplicates
 * of the homepage", which is why nothing but the homepage could ever be
 * indexed. components/Seo.jsx does set the right tags, but only after React
 * runs, and that render pass is a delayed second wave Google is not obliged to
 * do quickly. Social crawlers (WhatsApp, Facebook, X, LinkedIn) never run JS at
 * all, so every shared link showed the homepage card.
 *
 * What it does
 * ------------
 * After `react-scripts build`, copy build/index.html to build/<route>/index.html
 * for each route we know about at build time, rewriting the head SEO tags for
 * that page. Nothing about the JS bundle, styles, layout or behaviour changes —
 * the shipped app is byte-for-byte the same, only the pre-JS <head> differs.
 *
 * Titles and descriptions below MUST match what Seo.jsx renders for the same
 * route, otherwise Google sees one title before JS and a different one after.
 *
 * Dynamic routes (/blog/:slug) are deliberately NOT prerendered here — their
 * slugs live in the database, and fetching them during a Vercel build would
 * make deploys depend on the API being warm. They still improve, because the
 * hardcoded homepage canonical is gone from public/index.html: with no
 * canonical in the served HTML, Google self-canonicalises to the requested URL
 * instead of collapsing the page into the homepage.
 */

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://giftkartstore.in";
const SITE_NAME = "GIFTKART";
const OG_IMAGE = `${SITE_URL}/images/hero-banner.png`; // same default Seo.jsx uses

const BUILD_DIR = path.join(__dirname, "..", "build");
const CATALOG_FILE = path.join(__dirname, "..", "src", "data", "catalog.js");

// ---------------------------------------------------------------------------
// Brands come from the same file the app uses, so adding a brand to
// src/data/catalog.js automatically gets it a prerendered page. catalog.js is
// an ES module and this script is CommonJS, so it is read as text rather than
// required — a tolerant per-line match on the fields we need.
// ---------------------------------------------------------------------------
const readBrands = () => {
  const source = fs.readFileSync(CATALOG_FILE, "utf8");
  const block = source.slice(source.indexOf("export const BRANDS"));
  const body = block.slice(0, block.indexOf("];"));
  const brands = [];

  for (const line of body.split("\n")) {
    const slug = /slug:\s*"([^"]+)"/.exec(line);
    const name = /name:\s*"([^"]+)"/.exec(line);
    const tagline = /tagline:\s*"([^"]+)"/.exec(line);
    if (slug && name) {
      brands.push({ slug: slug[1], name: name[1], tagline: tagline ? tagline[1] : "" });
    }
  }

  if (brands.length === 0) throw new Error("prerender-seo: no BRANDS parsed from catalog.js");
  return brands;
};

// ---------------------------------------------------------------------------
// Route table. `title` / `description` mirror the <Seo> props on each page.
// ---------------------------------------------------------------------------
const buildRoutes = () => {
  const routes = [
    {
      path: "/",
      // Matches Home.jsx's <Seo title=...>. public/index.html keeps a shorter
      // generic title as the fallback for routes not listed here.
      title:
        "Buy Gift Cards Online in India — Amazon, Steam, PlayStation, Netflix & More | GIFTKART",
      description:
        "Buy digital gift cards online in India for Amazon, Steam, PlayStation, Xbox, Netflix, Flipkart, Google Play, Swiggy, Domino's & PayPal. Instant delivery, UPI & USDT accepted.",
      // This file doubles as the SPA fallback — see renderHead().
      selfCanonical: true,
    },
    {
      path: "/blog",
      title: "Blog — Gift Card Guides, Deals & Tips | GIFTKART",
      description:
        "Guides, tips and deals on buying gift cards in India — PlayStation, Steam, Amazon, Netflix and more.",
    },
    {
      path: "/contact",
      title: "Contact Us — GIFTKART Gift Card Support",
      description:
        "Get in touch with GIFTKART for order help, gift card issues, or general questions. We reply as fast as we can.",
    },
    {
      path: "/refund-policy",
      title: "Refund & Cancellation Policy — GIFTKART",
      description: "Read GIFTKART's refund and cancellation policy for gift card orders.",
    },
    {
      path: "/terms",
      title: "Terms of Service — GIFTKART",
      description:
        "Read GIFTKART's terms of service covering gift card purchases, delivery, and account use.",
    },
  ];

  // Mirrors BrandProducts.jsx exactly.
  for (const brand of readBrands()) {
    routes.push({
      path: `/brand/${brand.slug}`,
      title: `Buy ${brand.name} Gift Cards Online in India | Instant Delivery — ${SITE_NAME}`,
      description: `Buy ${brand.name} gift cards online in India. ${brand.tagline}. Instant digital delivery, 100% genuine codes, UPI & USDT accepted.`,
    });
  }

  return routes;
};

// ---------------------------------------------------------------------------
// Head rewriting. CRA minifies index.html (collapseWhitespace + removeComments),
// so HTML comments can't be used as markers and tag formatting isn't stable.
// These matchers key off the tag's identifying attribute instead, and anything
// missing is appended just before </head> rather than silently skipped.
// ---------------------------------------------------------------------------
const escapeAttr = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeText = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace the tag matching `pattern`, or append `replacement` before </head>.
const upsert = (html, pattern, replacement) => {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace(/<\/head>/i, `${replacement}</head>`);
};

const setTitle = (html, title) =>
  upsert(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeText(title)}</title>`);

const setMeta = (html, attr, key, content) =>
  upsert(
    html,
    new RegExp(`<meta[^>]*\\s${attr}="${key}"[^>]*>`, "i"),
    `<meta ${attr}="${key}" content="${escapeAttr(content)}"/>`
  );

const setCanonical = (html, href) =>
  upsert(
    html,
    /<link[^>]*\srel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeAttr(href)}"/>`
  );

const strip = (html, pattern) => html.replace(pattern, "");

const renderHead = (html, route) => {
  const url = `${SITE_URL}${route.path === "/" ? "/" : route.path}`;
  let out = setTitle(html, route.title);
  out = setMeta(out, "name", "description", route.description);
  out = setMeta(out, "name", "robots", "index, follow");

  // build/index.html is both the homepage AND the SPA fallback Vercel serves
  // for any route without its own file — blog posts, most importantly. A
  // hardcoded canonical there is exactly the bug this script exists to kill:
  // it told Google every one of those URLs was a duplicate of the homepage.
  // Leaving canonical/og:url out entirely makes Google self-canonicalise to
  // whatever URL was requested, which is the correct answer for both the
  // homepage and /blog/<slug>. Prerendered routes below get an explicit one.
  if (route.selfCanonical) {
    out = strip(out, /<link[^>]*\srel="canonical"[^>]*>/i);
    out = strip(out, /<meta[^>]*\sproperty="og:url"[^>]*>/i);
  } else {
    out = setCanonical(out, url);
    out = setMeta(out, "property", "og:url", url);
  }

  out = setMeta(out, "property", "og:type", "website");
  out = setMeta(out, "property", "og:site_name", SITE_NAME);
  out = setMeta(out, "property", "og:title", route.title);
  out = setMeta(out, "property", "og:description", route.description);
  out = setMeta(out, "property", "og:image", OG_IMAGE);
  out = setMeta(out, "name", "twitter:card", "summary_large_image");
  out = setMeta(out, "name", "twitter:title", route.title);
  out = setMeta(out, "name", "twitter:description", route.description);
  out = setMeta(out, "name", "twitter:image", OG_IMAGE);
  return out;
};

const main = () => {
  const indexFile = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(indexFile)) {
    throw new Error(`prerender-seo: ${indexFile} not found — run react-scripts build first`);
  }

  const template = fs.readFileSync(indexFile, "utf8");
  const routes = buildRoutes();

  for (const route of routes) {
    const html = renderHead(template, route);
    // "/" overwrites build/index.html (which is also the SPA fallback for
    // every route not in this list); "/brand/psn" becomes
    // build/brand/psn/index.html, which Vercel serves for /brand/psn.
    const outFile =
      route.path === "/"
        ? indexFile
        : path.join(BUILD_DIR, route.path.replace(/^\//, ""), "index.html");

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
    console.log(`prerender-seo: ${route.path} -> ${path.relative(BUILD_DIR, outFile)}`);
  }

  console.log(`prerender-seo: wrote ${routes.length} pages`);
};

if (require.main === module) main();

module.exports = { readBrands, buildRoutes, renderHead };
