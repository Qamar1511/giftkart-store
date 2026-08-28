const { CATEGORIES, BRANDS, getBrand, pricesFor, CURRENCIES, CURRENCY_CODES, DEFAULT_CURRENCY, getRates } = require("../config/catalog");
const { getAvailableCounts } = require("../utils/stockReservation");
const User = require("../models/User");
const StockNotification = require("../models/StockNotification");

// @route  GET /api/products/currencies
// @access Public
// Live currency configs including the CURRENT admin-set price multipliers.
// The client mirrors these into its own catalog (client/src/data/catalog.js)
// so cart/checkout totals — which are computed client-side from
// denomination × rate — always match what the server will charge.
exports.getCurrencyConfig = async (req, res) => {
  try {
    const rates = getRates();
    res.status(200).json({
      defaultCurrency: DEFAULT_CURRENCY,
      rates,
      currencies: CURRENCY_CODES.map((code) => ({
        code,
        symbol: CURRENCIES[code].symbol,
        label: CURRENCIES[code].label,
        decimals: CURRENCIES[code].decimals,
        rate: rates[code],
      })),
    });
  } catch (error) {
    console.error("Get currency config error:", error);
    res.status(500).json({ message: "Couldn't load currency settings." });
  }
};

// @route  GET /api/products
// @access Public
// Returns every brand with its denominations, each flattened into a
// single sellable "product" with live stock counts attached.
//
// Stock for all 42 brand+denomination pairs comes from ONE aggregation
// (getAvailableCounts) rather than a countDocuments per pair. Everything else
// in the response is static config, so this handler makes exactly one DB call.
exports.getGiftCardProducts = async (req, res) => {
  try {
    const counts = await getAvailableCounts();

    const brands = BRANDS.map((brand) => {
      const products = brand.denominations.map((denomination) => {
        // A pair with nothing sellable left produces no group in the
        // aggregation, so an absent key means zero.
        const availableStock = counts[`${brand.slug}:${denomination}`] || 0;
        const image = (brand.denominationImages && brand.denominationImages[denomination]) || brand.image || null;
        return {
          id: `${brand.slug}-${denomination}`,
          brand: brand.slug,
          brandName: brand.name,
          denomination,
          // `denomination` is the card's face value (always ₹, what the
          // customer redeems). `pricing` is what we actually charge in
          // each buying currency, e.g. { INR: 1100, USDT: 11 } — the
          // frontend shows the price for the shopper's chosen currency.
          pricing: pricesFor(denomination),
          title: brand.tagline,
          image,
          inStock: availableStock > 0,
          availableStock,
        };
      });
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
    });

    // The catalog is identical for every visitor, so a short shared cache is
    // safe and saves a DB hit on reloads and back-navigation. Kept well under
    // the client's own 2-minute in-memory cache (services/productService.js),
    // so this can never be the staler of the two. Stock is never trusted from
    // here anyway — checkout re-verifies it server-side before delivering.
    res.set("Cache-Control", "public, max-age=60");
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
