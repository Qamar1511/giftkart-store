import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBlogPostBySlug, resolveImageUrl } from "../services/blogService";
import Seo, { SITE_URL } from "../components/Seo";
import "../styles/Shop.css";

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getBlogPostBySlug(slug)
      .then(setPost)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="shop-page">
        <p className="shop-status">Loading…</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="shop-page">
        <Seo title="Post not found — GIFTKART" path={`/blog/${slug}`} noindex />
        <h1 className="section-heading">Post not found</h1>
        <p className="shop-status">
          This post doesn't exist or has been unpublished. <Link to="/blog">Back to blog</Link>
        </p>
      </div>
    );
  }

  const resolvedCoverImage = resolveImageUrl(post.coverImage);

  return (
    <div className="shop-page blog-post-page">
      <Seo
        title={post.metaTitle || `${post.title} | GIFTKART Blog`}
        description={post.metaDescription || post.excerpt}
        path={`/blog/${post.slug}`}
        ogImage={resolvedCoverImage}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: resolvedCoverImage ? [resolvedCoverImage] : undefined,
          author: { "@type": "Organization", name: post.author || "GIFTKART Team" },
          publisher: { "@type": "Organization", name: "GIFTKART" },
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        }}
      />
      <Link to="/blog" className="footer-link">← Back to blog</Link>
      {resolvedCoverImage && (
        <div className="blog-post-cover" style={{ backgroundImage: `url(${resolvedCoverImage})` }} />
      )}
      <h1 className="confirmation-heading" style={{ marginTop: "1rem" }}>{post.title}</h1>
      <p className="shop-status">
        {post.author || "GIFTKART Team"} · {formatDate(post.publishedAt || post.createdAt)}
      </p>
      <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
};

export default BlogPost;
