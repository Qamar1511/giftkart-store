const BlogPost = require("../models/BlogPost");

// @route  GET /api/blog
// @access Public — only ever returns published posts
exports.getPublishedPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true })
      .select("title slug excerpt coverImage author publishedAt createdAt")
      .sort({ publishedAt: -1, createdAt: -1 });

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
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true });
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.status(200).json({ post });
  } catch (error) {
    console.error("Get blog post error:", error);
    res.status(500).json({ message: "Couldn't load this post" });
  }
};
