const { CATEGORIES, BRANDS, getBrand } = require("../config/catalog");
const { getAvailableCount } = require("../utils/stockReservation");
const User = require("../models/User");
const StockNotification = require("../models/StockNotification");

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
            const availableStock = await getAvailableCount(brand.slug, denomination);
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

// @route  POST /api/products/notify
// @access Private
// "Notify me" on an out-of-stock card. We store one subscription per
// user+brand+denomination (upsert, so clicking it again just resets
// `notified` to false rather than erroring). See adminController's
// addStockCodes for where these get emailed and cleared out.
exports.requestStockNotification = async (req, res) => {
  try {
    const { brand: brandSlug, denomination } = req.body;
    const brand = getBrand(brandSlug);
    const denomNum = Number(denomination);

    if (!brand || !brand.denominations.includes(denomNum)) {
      return res.status(400).json({ message: "Invalid brand or denomination." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    await StockNotification.findOneAndUpdate(
      { user: user._id, brand: brand.slug, denomination: denomNum },
      { email: user.email, notified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: `We'll email you the moment ${brand.name} ₹${denomNum} is back in stock.`,
    });
  } catch (error) {
    console.error("Stock notification signup error:", error);
    res.status(500).json({ message: "Couldn't set up that notification. Please try again." });
  }
};
