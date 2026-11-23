const express = require("express");
const { getPublishedPosts, getPostBySlug } = require("../controllers/blogController");

const router = express.Router();

// Public — no auth needed, these power the /blog pages search engines crawl
router.get("/", getPublishedPosts);
router.get("/:slug", getPostBySlug);

module.exports = router;
