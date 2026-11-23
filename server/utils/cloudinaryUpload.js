/*
 * Cloudinary image upload — no SDK, no new dependency.
 *
 * WHY THIS EXISTS
 * The admin blog editor used to save cover images with fs.writeFileSync into
 * server/uploads/blog/. That writes to the *running backend's own filesystem*,
 * which is wiped on every redeploy/restart of the API host. The DB kept the
 * /uploads/blog/<file> path, so the file vanished while the path stayed and the
 * blog card rendered an empty box. On 2026-09-04 exactly two covers still
 * worked — the only two whose files had accidentally been committed to git.
 * Cloudinary keeps the file off our disk, so an upload survives forever.
 *
 * Implemented with the plain REST API using axios (already a dependency) and
 * node's built-in crypto for the signature — deliberately avoiding the
 * `cloudinary` npm package so no install step is needed to deploy this.
 *
 * Needs three env vars, all from the Cloudinary dashboard:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * When they're absent the caller falls back to the old local-disk behaviour, so
 * `npm run dev` and a not-yet-configured deploy both keep working.
 */

const crypto = require("crypto");
const axios = require("axios");

const CLOUD_NAME = () => process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = () => process.env.CLOUDINARY_API_KEY;
const API_SECRET = () => process.env.CLOUDINARY_API_SECRET;

// Read at call time, not module load — server.js may call dotenv after this
// file is required.
exports.isCloudinaryConfigured = () => Boolean(CLOUD_NAME() && API_KEY() && API_SECRET());

/*
 * Cloudinary signs uploads as sha1(<params sorted by key, joined k=v&…> + api_secret).
 * `file`, `api_key`, `resource_type` and `cloud_name` are excluded from the
 * signed string — everything else that's sent must be included or the upload is
 * rejected with "Invalid Signature".
 */
const signParams = (params) => {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(canonical + API_SECRET()).digest("hex");
};

/*
 * Delivery-time transformations, injected into the returned URL rather than
 * applied at upload: the original stays untouched in Cloudinary while visitors
 * get a resized, auto-compressed, auto-WebP/AVIF version.
 *   f_auto   → WebP/AVIF when the browser supports it
 *   q_auto   → quality picked per image
 *   w_1200,c_limit → never wider than 1200px (the blog cover spec), and
 *                    c_limit only ever shrinks, so smaller images are untouched
 * This is what makes the "compress the cover before uploading" step unnecessary.
 */
const withDeliveryTransforms = (secureUrl) =>
  secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_1200,c_limit/");

/**
 * Upload an in-memory image buffer (multer memoryStorage) to Cloudinary.
 * Returns an absolute https URL — which is why no client change is needed:
 * resolveImageUrl() already passes absolute URLs straight through.
 *
 * @param {Buffer} buffer
 * @param {string} mimetype  e.g. "image/webp"
 * @param {string} folder    Cloudinary folder, defaults to "blog"
 * @returns {Promise<string>} the CDN URL to store as coverImage
 */
exports.uploadImageBuffer = async (buffer, mimetype, folder = "blog") => {
  if (!exports.isCloudinaryConfigured()) {
    throw new Error("Cloudinary env vars are not set");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ folder, timestamp });

  // Sent as a base64 data URI in an x-www-form-urlencoded body, so there's no
  // multipart assembly and therefore no form-data dependency. Multer caps the
  // upload at 5 MB (~6.7 MB base64), far below Cloudinary's 60 MB base64 limit.
  const body = new URLSearchParams({
    file: `data:${mimetype || "image/jpeg"};base64,${buffer.toString("base64")}`,
    api_key: API_KEY(),
    timestamp: String(timestamp),
    folder,
    signature,
  });

  const { data } = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME()}/image/upload`,
    body,
    { timeout: 60000, maxBodyLength: Infinity, maxContentLength: Infinity }
  );

  if (!data || !data.secure_url) {
    throw new Error("Cloudinary returned no secure_url");
  }

  return withDeliveryTransforms(data.secure_url);
};
