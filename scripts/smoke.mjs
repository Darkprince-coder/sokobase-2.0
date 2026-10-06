// Smoke test for a running deployment: key pages load, old URLs redirect, security headers are
// present, previews render, and the portal/public split holds.
//
//   SMOKE_SITE_URL=https://sokobase.co.ke SMOKE_PORTAL_URL=https://portal.sokobase.co.ke npm run smoke
//   SMOKE_SITE_URL=https://your-preview.vercel.app npm run smoke        (portal checks skipped)
//
// Read-only: it only sends GET requests, plus one cross-site POST that the server must ignore.
const site = (process.env.SMOKE_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const portal = process.env.SMOKE_PORTAL_URL?.replace(/\/$/, "");

const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, ok: detail === true || detail === undefined, detail: detail === true ? "" : detail ?? "" });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  }
};
const get = (url, init = {}) => fetch(url, { redirect: "manual", ...init, headers: { "user-agent": "SokoBase-smoke/1.0", ...(init.headers ?? {}) } });
const expectStatus = async (url, statuses) => {
  const res = await get(url);
  return statuses.includes(res.status) || `got ${res.status}`;
};
const expectRedirect = async (url, toPath) => {
  const res = await get(url);
  const loc = res.headers.get("location") ?? "";
  return ([301, 302, 307, 308].includes(res.status) && new URL(loc, url).pathname.startsWith(toPath)) || `got ${res.status} -> ${loc || "(no redirect)"}`;
};

for (const path of ["/", "/products", "/stores", "/sell", "/about", "/contact", "/privacy", "/terms", "/saved"]) {
  await check(`Page ${path} loads`, () => expectStatus(site + path, [200]));
}
await check("Search page works", () => expectStatus(`${site}/products?q=phone&sort=newest`, [200]));
await check("Unknown page returns 404", () => expectStatus(`${site}/this-page-does-not-exist-xyz`, [404]));

await check("robots.txt lists the sitemap", async () => {
  const text = await (await get(`${site}/robots.txt`)).text();
  return /Sitemap:/i.test(text) || "no Sitemap line";
});
await check("sitemap.xml is valid", async () => {
  const res = await get(`${site}/sitemap.xml`);
  const text = await res.text();
  return (res.status === 200 && text.includes("<urlset")) || `status ${res.status}`;
});
await check("Home preview image renders", async () => {
  const res = await get(`${site}/opengraph-image`);
  return (res.status === 200 && (res.headers.get("content-type") ?? "").startsWith("image/")) || `status ${res.status} ${res.headers.get("content-type")}`;
});

await check("Security headers are set", async () => {
  const res = await get(site + "/");
  const missing = ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"].filter((h) => !res.headers.get(h));
  if (site.startsWith("https://") && !res.headers.get("strict-transport-security")) missing.push("strict-transport-security");
  if (res.headers.get("x-powered-by")) missing.push("(x-powered-by should be absent)");
  return missing.length === 0 || `missing: ${missing.join(", ")}`;
});

await check("Old /listings URL redirects", () => expectRedirect(`${site}/listings/sofa-set`, "/products"));
await check("Old /browse URL redirects", () => expectRedirect(`${site}/browse`, "/products"));

await check("Cross-site order-click posts are ignored", async () => {
  const res = await get(`${site}/api/order-click`, {
    method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ businessId: "00000000-0000-0000-0000-000000000000" }),
  });
  return res.status === 204 || `got ${res.status}`;
});

if (portal) {
  await check("Sign-in is hidden on the public site", () => expectRedirect(`${site}/login`, "/"));
  await check("Admin is hidden on the public site", () => expectRedirect(`${site}/admin`, "/"));
  await check("Portal home goes to sign-in", () => expectRedirect(`${portal}/`, "/login"));
  await check("Portal sign-in page loads, not indexed", async () => {
    const res = await get(`${portal}/login`);
    return (res.status === 200 && (res.headers.get("x-robots-tag") ?? "").includes("noindex")) || `status ${res.status}, x-robots-tag ${res.headers.get("x-robots-tag")}`;
  });
  await check("Portal sends shoppers to the public site", async () => {
    const res = await get(`${portal}/products`);
    const loc = res.headers.get("location") ?? "";
    return loc.startsWith(site) || `got ${res.status} -> ${loc}`;
  });
  await check("Portal robots.txt blocks crawling", async () => {
    const text = await (await get(`${portal}/robots.txt`)).text();
    return /Disallow:\s*\/\s*$/m.test(text) || "portal is crawlable";
  });
} else {
  console.log("(Set SMOKE_PORTAL_URL to also check the portal/public split.)\n");
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `  -> ${r.detail}`}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed against ${site}`);
process.exit(failed ? 1 : 0);
