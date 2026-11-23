const sanitizeHtml = require("sanitize-html");

// Blog posts are stored as HTML and the website renders them with
// dangerouslySetInnerHTML — i.e. whatever is in `content` runs in every
// visitor's browser. If a post contains <script>, an onerror= handler or a
// javascript: link, it executes for everyone who opens it (and can read the
// logged-in admin's session token). This allow-list keeps the formatting the
// blog actually uses (headings, paragraphs, lists, links, images, tables and
// the .blog-callout / .blog-cta-* boxes) and removes everything else:
// scripts, iframes, forms, inline styles, on* event handlers, and any link or
// image address that isn't plain http(s) / mailto / tel.
//
// It is applied when a post is SAVED and again when it is SERVED, so a
// malicious post already sitting in the database is neutralised too.
const OPTIONS = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "strong", "b", "em", "i", "u", "s", "small", "sup", "sub",
    "a", "img", "figure", "figcaption", "div", "span",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "class"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding", "class"],
    "*": ["class", "aria-hidden"],
  },
  // Only the blog's own style hooks; any other class name is dropped.
  allowedClasses: { "*": ["blog-*"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    // Links that open a new tab must not hand the new page access to this one.
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer" } }),
  },
};

exports.sanitizeBlogHtml = (html) => sanitizeHtml(String(html ?? ""), OPTIONS);
