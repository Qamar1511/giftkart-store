const BlogPost = require("../models/BlogPost");

// Published posts change rarely (a post is written once, then read many
// times), so both public endpoints below allow a short shared cache. This
// keeps repeat visits and back-navigation off the database entirely. The admin
// panel reads /api/admin/blog instead, so an editor never sees a cached copy
// of their own draft.
const PUBLIC_CACHE = "public, max-age=120";

// @route  GET /api/blog
// @access Public — only ever returns published posts
exports.getPublishedPosts = async (req, res) => {
  try {
    // `content` is deliberately not selected: the listing only needs the
    // excerpt, and post bodies are multi-KB HTML strings that would bloat this
    // response for nothing. `.lean()` skips Mongoose document hydration since
    // we only serialise the result.
    const posts = await BlogPost.find({ published: true })
      .select("title slug excerpt coverImage author publishedAt createdAt")
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    res.set("Cache-Control", PUBLIC_CACHE);
    res.status(200).json({ posts });
  } catch (error) {
    console.error("Get blog posts error:", error);
    res.status(500).json({ message: "Couldn't load blog posts" });
  }
};

// @route  GET /api/blog/:slug
// @access Public — 404s on drafts too, so unpublished posts can't be
// guessed/viewed just by knowing the slug.
exports.getPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true }).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.set("Cache-Control", PUBLIC_CACHE);
    res.status(200).json({ post });
  } catch (error) {
    console.error("Get blog post error:", error);
    res.status(500).json({ message: "Couldn't load this post" });
  }
};
