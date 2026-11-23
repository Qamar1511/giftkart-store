// Quick self-test for the blog HTML sanitizer. Run it once after
// `npm install` (it needs the sanitize-html package):
//
//   node scripts/testSanitizer.js
//
// It feeds the sanitizer the kind of markup an attacker would put in a blog
// post and checks the dangerous parts are removed while the formatting the
// blog really uses is kept. Prints PASS/FAIL per check; touches no database.
const { sanitizeBlogHtml } = require("../utils/sanitizeBlogHtml");

let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed++;
};

const out = (html) => sanitizeBlogHtml(html);

/* things that must be removed */
check(!/<script/i.test(out('<p>hi</p><script>alert(1)</script>')), "<script> tag removed");
check(!/alert\(1\)/.test(out('<script>alert(1)</script>')), "script CONTENT removed too");
check(!/onerror/i.test(out('<img src="x" onerror="alert(1)">')), "onerror handler removed");
check(!/onclick/i.test(out('<p onclick="steal()">x</p>')), "onclick handler removed");
check(!/javascript:/i.test(out('<a href="javascript:alert(1)">x</a>')), "javascript: link removed");
check(!/<iframe/i.test(out('<iframe src="https://evil.example"></iframe>')), "<iframe> removed");
check(!/<form|<input|<button/i.test(out('<form action="/x"><input name="a"><button>go</button></form>')), "form controls removed");
check(!/style=/i.test(out('<p style="position:fixed;inset:0">x</p>')), "inline style removed");
check(!/data:text\/html/i.test(out('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')), "data: URL removed");
check(!/<img[^>]*src="(javascript|data):/i.test(out('<img src="javascript:alert(1)">')), "javascript: image source removed");
check(!/<object|<embed/i.test(out('<object data="x"></object><embed src="x">')), "<object>/<embed> removed");

/* things that must survive, or posts would lose their formatting */
check(/<h2>Heading<\/h2>/.test(out("<h2>Heading</h2>")), "h2 kept");
check(/<ul>\s*<li>one<\/li>/.test(out("<ul><li>one</li></ul>")), "lists kept");
check(/<strong>bold<\/strong>/.test(out("<p><strong>bold</strong></p>")), "strong kept");
check(/href="https:\/\/giftkartstore\.in\/brand\/psn"/.test(out('<a href="https://giftkartstore.in/brand/psn">x</a>')), "https link kept");
check(/href="\/brand\/psn"/.test(out('<a href="/brand/psn">x</a>')), "relative link kept");
check(/<img[^>]*src="\/images\/giftcards\/psn-2000\.jpg"/.test(out('<img src="/images/giftcards/psn-2000.jpg" alt="card" width="700" height="560" loading="lazy">')), "relative image kept");
check(/class="blog-callout"/.test(out('<div class="blog-callout"><p>tip</p></div>')), "blog-callout class kept");
check(/class="blog-cta-button"/.test(out('<a href="/brand/psn" class="blog-cta-button">Go</a>')), "blog-cta-button class kept");
check(!/class="evil"/.test(out('<p class="evil">x</p>')), "unknown class names dropped");
check(/rel="noopener noreferrer"/.test(out('<a href="https://x.example" target="_blank">x</a>')), "links get rel=noopener noreferrer");

console.log(failed ? `\n${failed} check(s) FAILED — tell me which ones.` : "\nAll checks passed.");
process.exitCode = failed ? 1 : 0;
