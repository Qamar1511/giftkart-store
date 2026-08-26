const BlogPost = require("../models/BlogPost");

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

// @route  GET /api/admin/blog
// @access Admin — includes drafts, unlike the public list
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.status(200).json({ posts });
  } catch (error) {
    console.error("Admin get blog posts error:", error);
    res.status(500).json({ message: "Couldn't load blog posts" });
  }
};

// @route  GET /api/admin/blog/:id
// @access Admin
exports.getPostById = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json({ post });
  } catch (error) {
    console.error("Admin get blog post error:", error);
    res.status(500).json({ message: "Couldn't load this post" });
  }
};

// @route  POST /api/admin/blog
// @access Admin
exports.createPost = async (req, res) => {
  try {
    const { title, slug, excerpt, content, coverImage, metaTitle, metaDescription, author, published } = req.body;

    if (!title || !excerpt || !content) {
      return res.status(400).json({ message: "Title, excerpt, and content are required" });
    }

    const finalSlug = slugify(slug || title);
    const existing = await BlogPost.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({ message: "A post with this slug already exists — please change the title or slug." });
    }

    const post = await BlogPost.create({
      title,
      slug: finalSlug,
      excerpt,
      content,
      coverImage,
      metaTitle,
      metaDescription,
      author,
      published: Boolean(published),
      publishedAt: published ? new Date() : null,
    });

    res.status(201).json({ post });
  } catch (error) {
    console.error("Create blog post error:", error);
    res.status(500).json({ message: "Couldn't create this post" });
  }
};

// @route  PUT /api/admin/blog/:id
// @access Admin
exports.updatePost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const { title, slug, excerpt, content, coverImage, metaTitle, metaDescription, author, published } = req.body;

    if (slug && slug !== post.slug) {
      const finalSlug = slugify(slug);
      const existing = await BlogPost.findOne({ slug: finalSlug, _id: { $ne: post._id } });
      if (existing) {
        return res.status(400).json({ message: "A post with this slug already exists" });
      }
      post.slug = finalSlug;
    }

    if (title !== undefined) post.title = title;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (content !== undefined) post.content = content;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (metaTitle !== undefined) post.metaTitle = metaTitle;
    if (metaDescription !== undefined) post.metaDescription = metaDescription;
    if (author !== undefined) post.author = author;

    if (published !== undefined) {
      const wasPublished = post.published;
      post.published = Boolean(published);
      if (post.published && !wasPublished) post.publishedAt = new Date();
      if (!post.published) post.publishedAt = null;
    }

    await post.save();
    res.status(200).json({ post });
  } catch (error) {
    console.error("Update blog post error:", error);
    res.status(500).json({ message: "Couldn't update this post" });
  }
};

// @route  DELETE /api/admin/blog/:id
// @access Admin
exports.deletePost = async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    console.error("Delete blog post error:", error);
    res.status(500).json({ message: "Couldn't delete this post" });
  }
};
