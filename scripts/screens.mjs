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
for (const size of sizes) {
  const ctx = await browser.newContext(devices[size]);
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);
    // Optional: click something first (e.g. open a menu): SCREENS_CLICK="button[aria-label='Open menu']"
    if (process.env.SCREENS_CLICK) { await page.click(process.env.SCREENS_CLICK).catch((e) => console.log("click failed:", e.message.split("\n")[0])); await page.waitForTimeout(500); }
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
