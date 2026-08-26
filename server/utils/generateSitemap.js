const BlogPost = require("../models/BlogPost");
const { BRANDS } = require("../config/catalog");

const SITE_URL = "https://giftkartstore.in";

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/refund-policy", changefreq: "monthly", priority: "0.3" },
  { path: "/blog", changefreq: "daily", priority: "0.7" },
];

const url = (loc, changefreq, priority, lastmod) => `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`;

// GET /sitemap.xml — regenerated on every request from what's actually in
// the database, so newly published blog posts show up automatically
// without anyone having to hand-edit a static file.
exports.generateSitemap = async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true }).select("slug updatedAt");

    const entries = [
      ...STATIC_PAGES.map((p) => url(`${SITE_URL}${p.path}`, p.changefreq, p.priority)),
      ...BRANDS.map((b) => url(`${SITE_URL}/brand/${b.slug}`, "weekly", "0.9")),
      ...posts.map((p) =>
        url(`${SITE_URL}/blog/${p.slug}`, "monthly", "0.6", p.updatedAt?.toISOString().split("T")[0])
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Couldn't generate sitemap");
  }
};
