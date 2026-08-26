import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBlogPosts } from "../services/blogService";
import Seo from "../components/Seo";
import "../styles/Shop.css";

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
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

      {loading && <p className="shop-status">Loading posts…</p>}
      {error && <p className="shop-status shop-status-error">{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p className="shop-status">No posts published yet — check back soon.</p>
      )}

      <div className="blog-grid">
        {posts.map((post) => (
          <Link to={`/blog/${post.slug}`} className="blog-card" key={post._id}>
            {post.coverImage && (
              <div className="blog-card-image" style={{ backgroundImage: `url(${post.coverImage})` }} />
            )}
            <div className="blog-card-body">
              <span className="blog-card-date">{formatDate(post.publishedAt || post.createdAt)}</span>
              <h2 className="blog-card-title">{post.title}</h2>
              <p className="blog-card-excerpt">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Blog;
