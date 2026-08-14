const GiftCardStock = require("../models/GiftCardStock");
const { CATEGORIES, BRANDS } = require("../config/catalog");

// @route  GET /api/products
// @access Public
// Returns every brand with its denominations, each flattened into a
// single sellable "product" with live stock counts attached.
exports.getGiftCardProducts = async (req, res) => {
  try {
    const brands = await Promise.all(
      BRANDS.map(async (brand) => {
        const products = await Promise.all(
          brand.denominations.map(async (denomination) => {
            const availableStock = await GiftCardStock.countDocuments({
              brand: brand.slug,
              denomination,
              isUsed: false,
            });
            const image = (brand.denominationImages && brand.denominationImages[denomination]) || brand.image || null;
            return {
              id: `${brand.slug}-${denomination}`,
              brand: brand.slug,
              brandName: brand.name,
              denomination,
              currency: "INR",
              title: brand.tagline,
              image,
              inStock: availableStock > 0,
              availableStock,
            };
          })
        );
        return {
          slug: brand.slug,
          name: brand.name,
          tagline: brand.tagline,
          category: brand.category,
          color: brand.color,
          image: brand.image,
          products,
          inStock: products.some((p) => p.inStock),
        };
      })
    );

    res.status(200).json({ categories: CATEGORIES, brands });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Couldn't load products right now." });
  }
};
