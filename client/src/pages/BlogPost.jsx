import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBlogPostBySlug, getCachedBlogPost, resolveImageUrl } from "../services/blogService";
import Seo, { SITE_URL } from "../components/Seo";
import "../styles/Shop.css";

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

// Mirrors the real article's shape — cover, title, byline, body lines — so the
// page doesn't collapse to a single centred "Loading…" line and then expand.
const PostSkeleton = () => (
  <div className="shop-page blog-post-page" aria-busy="true" aria-label="Loading post">
    <div className="skeleton-block skeleton-block-wide" style={{ borderRadius: "0.9rem" }} />
    <div className="skeleton-line" style={{ width: "70%", height: "2rem", marginTop: "1.25rem" }} />
    <div className="skeleton-line" style={{ width: "30%", marginTop: "0.9rem" }} />
    <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {["100%", "96%", "88%", "100%", "72%", "94%", "60%"].map((width, i) => (
        <div className="skeleton-line" key={i} style={{ width }} />
      ))}
    </div>
  </div>
);

const BlogPost = () => {
  const { slug } = useParams();
  const contentRef = useRef(null);
  // If this post was opened before (or its slug is already cached from a
  // previous view), render it immediately instead of flashing a loader.
  const [post, setPost] = useState(() => getCachedBlogPost(slug));
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(!getCachedBlogPost(slug));

  useEffect(() => {
    const cached = getCachedBlogPost(slug);
    setPost(cached);
    setNotFound(false);
    setLoading(!cached);
    getBlogPostBySlug(slug)
      .then(setPost)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Reveal each .reveal-on-scroll section (added around H2 blocks in the
  // post's HTML) as it scrolls into view. Runs after the raw content is
  // injected via dangerouslySetInnerHTML, so it queries the DOM directly
  // rather than tracking React state for content it doesn't own.
  useEffect(() => {
    if (!post || !contentRef.current) return;

    const sections = contentRef.current.querySelectorAll(".reveal-on-scroll");
    if (sections.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      sections.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [post]);

  if (loading) {
    return <PostSkeleton />;
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
      <div className="blog-post-content" ref={contentRef} dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
};

export default BlogPost;
