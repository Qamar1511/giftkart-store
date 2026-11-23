const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    // URL-friendly identifier, e.g. "best-playstation-gift-card-deals" ->
    // giftkartstore.in/blog/best-playstation-gift-card-deals
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, required: true, trim: true }, // short summary shown on the blog list page
    content: { type: String, required: true }, // HTML body of the post
    coverImage: { type: String, default: "" }, // URL, optional

    // SEO fields — fall back to title/excerpt if left blank
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },

    author: { type: String, default: "GIFTKART Team" },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

blogPostSchema.index({ published: 1, publishedAt: -1 });

module.exports = mongoose.model("BlogPost", blogPostSchema);
