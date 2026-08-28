// Publishes the repo's blog posts into MongoDB.
//
//   node seed/seedBlogPosts.js
//
// Safe to run as many times as you like: posts are matched on `slug`, so a
// re-run updates the existing post in place instead of creating a duplicate
// (slug is a unique index on BlogPost). The original `publishedAt` is kept so
// re-publishing an edit doesn't reset the post's date — and therefore doesn't
// bump it to the top of /blog or change its sitemap entry.
require("dotenv").config();
const mongoose = require("mongoose");
const BlogPost = require("../models/BlogPost");
const posts = require("./blog");

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing — add it to server/.env first.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for blog seeding...");

  for (const post of posts) {
    const existing = await BlogPost.findOne({ slug: post.slug });

    if (existing) {
      // Grab this BEFORE the assign below overwrites it with the file's value.
      const originalPublishedAt = existing.publishedAt;
      Object.assign(existing, post);
      // Keep the date the post first went live.
      if (existing.published) {
        existing.publishedAt = originalPublishedAt || post.publishedAt || new Date();
      } else {
        existing.publishedAt = null;
      }
      await existing.save();
      console.log(`Updated: /blog/${post.slug}`);
    } else {
      await BlogPost.create({
        ...post,
        publishedAt: post.published ? post.publishedAt || new Date() : null,
      });
      console.log(`Created: /blog/${post.slug}`);
    }
  }

  console.log(`Done — ${posts.length} post(s) published.`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error("Blog seeding failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
