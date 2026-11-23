import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBlogPosts, getCachedBlogPosts, resolveImageUrl } from "../services/blogService";
import Seo from "../components/Seo";
import "../styles/Shop.css";

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

// Placeholder cards shaped like the real ones (16/9 cover, date line, title,
// two excerpt lines) so the grid keeps its final layout while posts load —
// previously this was a bare "Loading posts…" line, which meant the page
// visibly jumped from one line of text to a full grid.
const BlogSkeleton = () => (
  <div className="blog-grid" aria-busy="true" aria-label="Loading posts">
    {Array.from({ length: 3 }).map((_, i) => (
      <div className="blog-card" key={i}>
        <div className="skeleton-block skeleton-block-wide" />
        <div className="blog-card-body">
          <div className="skeleton-line" style={{ width: "35%" }} />
          <div className="skeleton-line" style={{ width: "80%", height: "1.1rem" }} />
          <div className="skeleton-line" style={{ width: "100%" }} />
          <div className="skeleton-line" style={{ width: "65%" }} />
        </div>
      </div>
    ))}
  </div>
);

const Blog = () => {
  // Served straight from the in-memory cache when we've already fetched the
  // list this session, so coming back to /blog doesn't flash a loader again.
  const cached = getCachedBlogPosts();
  const [posts, setPosts] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");

  useEffect(() => {
    getBlogPosts()
      .then(setPosts)
      .catch(() => setError("Couldn't load blog posts right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="shop-page">
      <Seo
        title="Blog — Gift Card Guides, Deals & Tips | GIFTKART"
        description="Guides, tips and deals on buying gift cards in India — PlayStation, Steam, Amazon, Netflix and more."
        path="/blog"
      />
      <h1 className="section-heading">Blog</h1>
      <p className="shop-status" style={{ marginTop: "-0.5rem", marginBottom: "1.5rem" }}>
        Guides, tips and deals on gift cards.
      </p>

      {loading && <BlogSkeleton />}
      {error && <p className="shop-status shop-status-error">{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p className="shop-status">No posts published yet — check back soon.</p>
      )}

      {posts.length > 0 && (
        <div className="blog-grid">
          {posts.map((post) => (
            <Link to={`/blog/${post.slug}`} className="blog-card" key={post._id}>
              {post.coverImage && (
                <div
                  className="blog-card-image"
                  style={{ backgroundImage: `url(${resolveImageUrl(post.coverImage)})` }}
                />
              )}
              <div className="blog-card-body">
                <span className="blog-card-date">{formatDate(post.publishedAt || post.createdAt)}</span>
                <h2 className="blog-card-title">{post.title}</h2>
                <p className="blog-card-excerpt">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;
