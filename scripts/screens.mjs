// Visual check: screenshots of key pages at phone, tablet and desktop sizes using the installed
// Chrome (no browser download). Also reports horizontal overflow, the most common layout bug.
//   SCREENS_URL=http://localhost:3000 SCREENS_OUT=./screens node scripts/screens.mjs /products /store/x
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.env.SCREENS_URL ?? "http://localhost:3000";
const out = process.env.SCREENS_OUT ?? "./screens";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
const sizes = (process.env.SCREENS_SIZES ?? "mobile,desktop").split(",");
const devices = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
};
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
// Optional: view pages as a signed-in business owner (local testing only). Creates a one-time
// sign-in link with the service key and opens it, exactly like a password-reset email would.
async function signIn(page) {
  const email = process.env.SCREENS_LOGIN_EMAIL;
  if (!email) return;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email }),
  }).then((r) => r.json());
  const hash = res.hashed_token ?? res.properties?.hashed_token;
  if (!hash) throw new Error(`could not create sign-in link: ${JSON.stringify(res).slice(0, 200)}`);
  await page.goto(`${base}/auth/confirm?token_hash=${hash}&type=magiclink&next=/dashboard`, { waitUntil: "networkidle" });
}

for (const size of sizes) {
  const ctx = await browser.newContext(devices[size]);
  const page = await ctx.newPage();
  await signIn(page);
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);
    // Optional: click something first (e.g. open a menu): SCREENS_CLICK="button[aria-label='Open menu']"
    // Optional: scroll down first (e.g. to check sticky elements): SCREENS_SCROLL=600
    if (process.env.SCREENS_SCROLL) { await page.evaluate((y) => window.scrollTo(0, y), Number(process.env.SCREENS_SCROLL)); await page.waitForTimeout(400); }
    // Several clicks can be chained with "||".
    for (const sel of (process.env.SCREENS_CLICK ?? "").split("||").filter(Boolean)) {
      await page.click(sel.trim(), { timeout: 5000 }).catch((e) => console.log("click failed:", e.message.split("\n")[0]));
      await page.waitForTimeout(400);
    }
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== "fixed")
        .filter((el) => !el.closest("[style*='overflow'], [class*='rail'], [class*='Rail'], [class*='chips'], [class*='row'], [class*='scroller'], [class*='list'], [class*='thumbs'], [class*='filterRow'], [class*='catInner'], [class*='tableWrap']"))
        .slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} (${Math.round(el.getBoundingClientRect().right)}px)`);
      return { scrollWidth: document.documentElement.scrollWidth, width: w, wide };
    });
    const name = `${process.env.SCREENS_PREFIX ?? ""}${size}${p.replace(/[^a-z0-9]+/gi, "_") || "_home"}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: process.env.SCREENS_FULL === "1" });
    console.log(`${name}.png  ${overflow.scrollWidth > overflow.width ? `OVERFLOW ${overflow.scrollWidth}>${overflow.width} ${overflow.wide.join(", ")}` : "no overflow"}`);
  }
  await ctx.close();
}
await browser.close();
