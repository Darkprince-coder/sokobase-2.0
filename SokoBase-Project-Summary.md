# SokoBase — Project Summary & Developer Handoff

_Last updated: end of Session 7_

## 1. What this project is

SokoBase is a multi-vendor e-commerce marketplace and PWA for Kenya, at
`sokobase.co.ke`. It gives small and medium businesses that can't afford
(or don't want) an individual website a shared storefront: each business
gets a page under `/store/<slug>` where it lists products and services,
and shares one link across all its marketing.

Key product decisions that shape the whole build:

- **No shopping cart.** Customers browse, optionally save items to a
  local wishlist, and tap **Order on WhatsApp**, which opens a chat with
  the business's own WhatsApp number, prefilled with the product and a
  link. The business closes the sale themselves, off-platform.
- **No customer accounts.** Anyone can browse and order without signing
  up. Only businesses (and the platform owner) authenticate.
- **Manual, invite-only business onboarding.** The owner runs the
  business side personally: a business contacts the owner (WhatsApp),
  pays for a plan, and the owner issues a one-time invite link from the
  admin dashboard. The business uses that link to self-register — set
  their own password, logo, categories, county, WhatsApp number, etc.
  There is no public sign-up form.
- **Manual, admin-managed subscriptions.** Three plans — Basic (KSh 500,
  20 products), Standard (KSh 1,000, 60 products), Pro (KSh 2,000,
  unlimited) — activated and renewed by the owner in the admin
  dashboard against M-Pesa payments confirmed off-platform (no payment
  gateway is integrated).
- **One domain, two "doors."** `sokobase.co.ke` is the public
  marketplace. `portal.sokobase.co.ke` (same codebase, same deploy, a
  second hostname pointed at the same project) is where the owner and
  businesses log in — completely unlinked from the public site so
  ordinary customers never see it.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, Server Components + Server Actions) |
| Language | TypeScript |
| Styling | CSS Modules, design tokens in `styles/tokens.css` (no Tailwind, no CSS framework) |
| Animation | Framer Motion |
| Icons | lucide-react only (no emoji, per the brand direction) |
| Fonts | Space Grotesk (display), Inter (body), IBM Plex Mono (prices/tags) — matched to the client's existing brand palette (green `#1F7A4D`, charcoal, warm paper background) |
| Database & Auth | Supabase (Postgres + Row Level Security + Supabase Auth) |
| Validation | zod, on every server action |
| Image hosting | Cloudinary (unsigned upload presets from the browser) |
| Analytics | Google Analytics 4 (`@next/third-parties`), Google Search Console |
| PWA | Hand-written service worker (`public/sw.js`), web manifest, install prompt |
| Hosting (assumed) | Vercel — one project, two custom domains (main + `portal.`) |

No cart, no payment gateway, no customer-facing email, no server framework
beyond Next.js itself. Deliberately lean.

## 3. How this project was built — workflow

This was built **session by session** in chat with an AI assistant, not
in one pass, because the developer (site owner, non-technical-by-trade)
copies generated files into their own local VS Code project by hand and
tests before continuing. The working pattern for every session was:

1. Agree scope for the session.
2. Generate **only new files, plus full replacements of any file that
   changed** (never a diff/patch — CSS Modules and React files were
   always sent whole).
3. Every session's deliverable is a `.zip` containing those files at
   their correct project-relative paths, **plus an `instructions.md`**
   inside the zip explaining: what's new, what to overwrite, any small
   manual one-line edits (kept out of the zip deliberately, to avoid
   regenerating a whole file for a one-line change), any SQL to run,
   any new environment variables, and a manual test checklist.
4. Nothing was ever compiled or run by the assistant (no network
   access in that environment) — all code is **unverified until the
   developer runs `npm run dev` / `npm run build` locally.**

This explains some of the "known bugs" below: a few are things the
assistant flagged as _likely_ correct but never got a build error back
on, because the feedback loop is "developer reports the error next
session," not instant compilation.

### Session log

| # | What it delivered |
|---|---|
| 1 | Initial brand/design pass (rejected — too "AI generated"), then a full redo matching the client's own existing `globals.css` palette/fonts. Layout, PWA shell, home page. |
| 2 | Supabase foundation: schema, Row Level Security policies, explicit Data-API grants (see §5), auth helpers, login page, `/admin` and `/dashboard` placeholders. |
| 3 | Super admin: invite generator, businesses list/detail, plan editor, category editor, hero-slide editor (Cloudinary-backed, drag-reorder). |
| 4 | Business registration flow (`/join?code=...`), and the **portal/public hostname split** (see §6). |
| 5 | Business dashboard v1: shop profile, product CRUD, self-service password change (re-verifies current password server-side first). |
| 6 | Public marketplace wired to real data (`/products`, `/stores`, `/store/[slug]`, `/products/[slug]`), product variants (size/colour with per-option pricing) and specs, a Kilimall-inspired product detail page, WhatsApp order-click tracking, route-level loading skeletons everywhere. |
| 7 | Counties (all 47, seeded), multi-category businesses (up to 3, DB-enforced), curated product subcategories (admin-managed, DB-enforced to match their parent category). Also fixed a bug where public category chips were reading a hardcoded list instead of the admin-managed database table. |

## 4. Directory structure (what to expect in the repo)

```
app/
  layout.tsx              root layout: fonts, GA4, JSON-LD, fetches categories
  page.tsx                home page (server component, reads Supabase)
  products/                /products list + /products/[slug] detail
  store/[slug]/            public storefront
  stores/                  shop directory
  join/                    invite-code registration (portal only)
  login/, admin/, dashboard/   portal-only auth surfaces
  api/order-click/route.ts    logs WhatsApp order taps (service-role only)
  manifest.ts, robots.ts, sitemap.ts, sw.js (public/)
components/
  <shared public components: Header, Footer, ProductCard, ProductDetail, ...>
  admin/                   admin-only components
  dashboard/                business-dashboard-only components
lib/
  supabase/{client,server,admin,public,proxy}.ts   4 different Supabase clients, see §5
  auth.ts                  requireUser / requireSuperAdmin / requireBusiness
  catalog.ts               all public-facing Supabase reads, mapped to app-friendly shapes
  admin.ts, dashboard.ts    role-gated helpers + error-message mapping
  site.ts, types.ts, format.ts, slug.ts, phone.ts, track.ts, icon-map.tsx, categories-context.tsx
supabase/migrations/
  0001_schema.sql
  0002_rls_and_grants.sql
  0003_seed.sql
  0004_variants_and_specs.sql
  0005_counties_categories_subcategories.sql
proxy.ts                   Next middleware (see note below)
```

**Note on `proxy.ts`:** written for Next.js 16's `proxy.ts` convention.
The developer is on an older Next.js version and renamed it to the
classic `middleware.ts` (exported function renamed `middleware`) — if
you're picking this repo up fresh, **check which one is actually
present** and keep it consistent with your Next.js version.

## 5. Database & security model

Everything is Postgres + Supabase Auth + Row Level Security. Two things
matter more than the usual RLS setup:

1. **Supabase now requires explicit Data-API grants.** New tables are
   not reachable from the browser just because RLS is on — every table
   has explicit `GRANT` statements per role (`anon`, `authenticated`,
   `service_role`), often **column-level** (e.g. anonymous visitors can
   `SELECT` a business's public fields but never its `owner_id`;
   business owners can `UPDATE` their own profile fields but not their
   `slug` or `status`).
2. **Business logic is enforced in the database, not just the UI**,
   via triggers and constraints, so a bug in a form can't bypass it:
   - A plan's product limit (`enforce_product_limit` trigger).
   - The 3-category cap per business (`enforce_category_limit`
     trigger).
   - A product's subcategory must belong to its own category — enforced
     by a **composite foreign key** (`subcategories(id, category_id)` →
     `products(subcategory_id, category_id)`), not just an app-side
     check.
   - Product writes are blocked entirely (`business_can_write()`) once
     a subscription lapses, even if someone calls the API directly.

Four different Supabase clients exist on purpose — mixing them up is
the most likely source of a future security bug, so know the
difference:

| Client | File | Uses | Bypasses RLS? |
|---|---|---|---|
| Browser | `lib/supabase/client.ts` | Client Components that need auth-aware reads | No |
| Server (cookie-aware) | `lib/supabase/server.ts` | Server Components/Actions acting **as the signed-in user** | No |
| Public (no cookies) | `lib/supabase/public.ts` | Anonymous, cacheable public-page reads (`lib/catalog.ts`) | No |
| Admin | `lib/supabase/admin.ts` | Server-only, after an explicit role check (`requireSuperAdmin`, invite validation, etc.) | **Yes — service role key** |

Invite codes are claimed **atomically** (`UPDATE ... WHERE used_at IS
NULL RETURNING ...`) so two simultaneous submissions of the same link
can't both succeed. Registration rolls back everything it created
(auth user, business, subscription) if any later step fails, and
releases the invite so the link still works.

## 6. The portal/public domain split

`/login`, `/admin`, `/dashboard`, `/join` only function on
`portal.sokobase.co.ke`. On the main domain they silently redirect to
`/`. This is enforced in `proxy.ts`/`middleware.ts` by hostname, **only
in production** (so `localhost` behaves normally in development without
needing a second local hostname). Nothing on the public site links to
the portal — invite links are the only way in, sent manually by the
owner on WhatsApp.

## 7. Environment variables

```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SITE_HOST
NEXT_PUBLIC_PORTAL_URL
NEXT_PUBLIC_PORTAL_HOST
NEXT_PUBLIC_SUPPORT_WHATSAPP
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY          # server only, never expose
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
NEXT_PUBLIC_GA_ID
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION   # only if Search Console uses the HTML-tag method
```

## 8. Known bugs / rough edges

None of this code has been run by the assistant that wrote it — it's
all pending the developer's own build/test pass. Specific things worth
checking or hardening:

- **`/api/order-click` has no rate limiting or dedup.** It's a public,
  unauthenticated POST endpoint (by design, so it can fire from a
  public product card). Right now nothing stops it being spammed to
  inflate or pollute a business's order-click stats.
- **Cloudinary uses unsigned upload presets.** Anyone who discovers the
  preset name (visible in client-side JS) can upload to that
  Cloudinary account, not just through this app. Restricted by format
  and size in the preset config, but not by origin. Fine for an MVP,
  not fine at scale.
- **No self-service "forgot password" for business owners.** Only the
  super admin can reset a business's password (from `/admin`), and only
  once they're already logged in can an owner change their own. There's
  no email-based reset flow yet (deliberately — Supabase's free-tier
  email sending is rate-limited and email confirmation was turned off
  at signup).
- **`PageProgress` (the top loading bar) is cosmetic**, not a true
  progress indicator — Next.js's router doesn't expose real navigation
  progress, so it just flashes on route change. The `loading.tsx`
  skeletons are the part actually doing the "don't look broken" work.
- **No automated tests anywhere** (no Playwright/Vitest/etc.). All
  testing so far is the manual checklists in each session's
  `instructions.md`.
- **No pagination.** `/products` and `/stores` currently just fetch up
  to 60–80 items and stop. Fine while the catalog is small; will need
  real pagination or infinite scroll once businesses and products grow.
- **Search is a plain `ILIKE '%term%'`** on product name only — no
  fuzzy matching, no ranking, no search across descriptions.
- **No destructive-action confirmations** in the UI (deleting a
  product, revoking an invite, suspending a business all fire
  immediately on click, no "are you sure").
- **Two hardcoded/legacy files were superseded but must be manually
  deleted** by the developer (`lib/mock.ts` in Session 6, `lib/
  categories.ts` in Session 7) — if they were never actually removed,
  they're just dead code, not a functional bug, but worth checking.

## 9. What's left before MVP launch

- **SEO polish pass** (planned Session 8): Search Console verification,
  a structured-data/metadata audit, redirects for any old indexed URLs.
- **Pre-launch hardening**: a branded 404 page, rate-limiting on
  `/api/order-click`, Privacy Policy and Terms pages, a full RLS/grants
  review across every table.
- **Production environment setup**: separate production Supabase
  project (if development has been against a shared one), production
  Cloudinary config, DNS/hosting for both domains, real plan pricing
  confirmed live end-to-end.
- **Final manual QA** across real devices and browsers, especially the
  PWA install flow and the WhatsApp deep-link on both Android and iOS.

## 10. Explicitly deferred (post-launch, by client decision)

Store/product **view analytics**, **sale recording**, and **monthly
performance reports** for businesses — agreed to be built after the
MVP is live, gated to Standard plan and above. The `order_clicks` table
already logs every WhatsApp order tap with a timestamp and is the raw
data that feature will read from; no rework needed to add it later.

## 11. Recommendations for whoever picks this up next

- Add confirmation dialogs on delete/suspend/revoke actions before any
  real business data is on the platform.
- Move Cloudinary to **signed** uploads (a small server route that
  signs the request) once there's real usage — closes the "anyone with
  the preset name can upload" gap.
- Add rate limiting (Upstash Redis, or even a simple IP+timestamp table)
  to `/api/order-click` before publicising the platform.
- Introduce Postgres full-text search (`tsvector`/`tsquery`) once the
  product catalog is large enough that `ILIKE` search feels weak.
- Add error monitoring (Sentry or similar) before real businesses
  depend on this in production — right now a runtime error has no
  automated visibility beyond what the developer notices manually.
- Set up scheduled Supabase backups / point-in-time recovery once the
  project is on a paid tier — subscriptions and business data are
  financially meaningful and currently have no documented backup plan.
- Consider a lightweight audit log for admin actions (subscription
  changes, suspensions, password resets) — there's currently no
  record of *who* did what beyond what's implicit in `created_by`
  columns on a couple of tables.
- When ready to build the deferred analytics feature, keep it
  read-only and scoped tightly (as `getOrderClicks30` already is) —
  never let a business's dashboard query `order_clicks` or any other
  service-role-only table directly.
