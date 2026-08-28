const PricingSetting = require("../models/PricingSetting");
const { getRates, setRates, DEFAULT_RATES } = require("../config/catalog");

/**
 * Bridge between the PricingSetting singleton in Mongo and the in-memory rate
 * cache that config/catalog.js `priceFor()` reads.
 *
 * priceFor() is synchronous and used everywhere (product listing, order
 * creation, invoices, emails), so we can't await a DB read inside it. Instead:
 *   • hydratePricing()  — called once at boot, copies DB → memory
 *   • savePricing()     — called by the admin controller, writes DB then memory
 */

// Load saved rates from the DB into the live cache. Safe to call before the
// document exists — we just keep the hardcoded defaults in that case.
async function hydratePricing() {
  try {
    const doc = await PricingSetting.findOne({ key: "pricing" }).lean();
    if (doc?.rates) {
      const applied = setRates(doc.rates);
      console.log("Pricing rates loaded from DB:", applied);
      return applied;
    }
    console.log("No saved pricing found — using default rates:", getRates());
  } catch (err) {
    // Never let a pricing read stop the server from booting; the hardcoded
    // defaults are always a valid fallback.
    console.error("Failed to load pricing rates, using defaults:", err.message);
  }
  return getRates();
}

// Persist new rates and apply them to the running process. The DB write goes
// FIRST on purpose: if it fails we throw before touching the in-memory cache,
// so the running server never ends up charging a price that wasn't saved.
// `rates` is validated by the caller; setRates() ignores anything non-positive.
async function savePricing(rates, adminId) {
  const doc = await PricingSetting.findOneAndUpdate(
    { key: "pricing" },
    { $set: { rates, updatedBy: adminId || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return setRates(doc?.rates || rates);
}

// Read the settings doc (for the admin screen's "last updated by/at" line).
async function readPricingDoc() {
  return PricingSetting.findOne({ key: "pricing" })
    .populate("updatedBy", "name email")
    .lean();
}

module.exports = { hydratePricing, savePricing, readPricingDoc, DEFAULT_RATES };
