// Run with: node seed/seedGiftCardStock.js
require("dotenv").config();
const mongoose = require("mongoose");
const GiftCardStock = require("../models/GiftCardStock");
const { BRANDS } = require("../config/catalog");

const CODES_PER_COMBO = 10;

function randomCode(brandSlug) {
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${brandSlug.toUpperCase()}-${segment()}-${segment()}-${segment()}`;
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding...");

  for (const brand of BRANDS) {
    for (const denomination of brand.denominations) {
      const codesToInsert = Array.from({ length: CODES_PER_COMBO }, () => ({
        brand: brand.slug,
        denomination,
        code: randomCode(brand.slug),
      }));
      await GiftCardStock.insertMany(codesToInsert);
      console.log(`Inserted ${CODES_PER_COMBO} codes for ${brand.name} ₹${denomination}`);
    }
  }

  console.log("Seeding complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
