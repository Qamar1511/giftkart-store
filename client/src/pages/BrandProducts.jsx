import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCatalog } from "../services/productService";
import GiftCardCard from "../components/GiftCardCard";
import BrandBadge from "../components/BrandBadge";
import Seo, { SITE_URL } from "../components/Seo";
import "../styles/Shop.css";

const BrandProducts = () => {
  const { slug } = useParams();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { brands } = await getCatalog();
        const found = brands.find((b) => b.slug === slug);
        if (!found) {
          setError("We couldn't find that gift card brand.");
        } else {
          setBrand(found);
        }
      } catch (err) {
        setError("Couldn't load this brand right now. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="shop-page">
        <p className="shop-status">Loading…</p>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="shop-page">
        <p className="shop-status shop-status-error">{error || "Brand not found."}</p>
        <Link to="/" className="navbar-btn navbar-btn-ghost" style={{ display: "inline-block", marginTop: "1rem" }}>
          Back to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <Seo
        title={`Buy ${brand.name} Gift Cards Online in India | Instant Delivery — GIFTKART`}
        description={`Buy ${brand.name} gift cards online in India. ${brand.tagline}. Instant digital delivery, 100% genuine codes, UPI & USDT accepted.`}
        path={`/brand/${brand.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${brand.name} Gift Cards`,
          url: `${SITE_URL}/brand/${brand.slug}`,
          itemListElement: (brand.products || []).map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Product",
              name: `${brand.name} Gift Card ₹${product.denomination}`,
              image: product.image ? `${SITE_URL}${product.image}` : undefined,
              brand: { "@type": "Brand", name: brand.name },
              offers: {
                "@type": "Offer",
                priceCurrency: "INR",
                price: product.denomination,
                availability: product.inStock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              },
            },
          })),
        }}
      />
      <div className="brand-page-header">
        <BrandBadge name={brand.name} color={brand.color} image={brand.image} size="lg" />
        <div>
          <h1 className="section-heading" style={{ margin: 0 }}>{brand.name} Gift Cards</h1>
          <p className="shop-status" style={{ margin: 0 }}>{brand.tagline}</p>
        </div>
      </div>

      <div className="products-grid">
        {brand.products.map((product) => (
          <GiftCardCard key={product.id} product={product} color={brand.color} />
        ))}
      </div>
    </div>
  );
};

export default BrandProducts;
