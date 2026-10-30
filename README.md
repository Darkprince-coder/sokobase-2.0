# SokoBase

A multi-vendor e-commerce marketplace built for small and medium businesses in Kenya that can't afford (or don't want) their own website. Each business gets a storefront at `/store/<slug>` to list products and services under one shared domain and link.

**Live:** [sokobase.co.ke](https://sokobase.co.ke)

## How it works

- **No shopping cart.** Customers browse and tap **Order on WhatsApp**, which opens a chat with the business's own number, prefilled with the product and a link — the business closes the sale themselves.
- **No customer accounts.** Anyone can browse and order without signing up. Only businesses and the platform owner authenticate.
- **Invite-only business onboarding.** A business registers through a one-time invite link issued from the admin dashboard, setting their own logo, categories, county, and WhatsApp number.
- **Subscription plans** (Basic / Standard / Pro) activated and renewed by the platform owner against M-Pesa payments.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, Server Components + Server Actions) |
| Language | TypeScript |
| Styling | CSS Modules, custom design tokens — no Tailwind |
| Animation | Framer Motion |
| Database & Auth | Supabase (Postgres + Row Level Security) |
| Validation | Zod on every server action |
| Images | Cloudinary |
| Error tracking | Sentry |
| Testing | Vitest (unit), Playwright (e2e) |
| PWA | Hand-written service worker, installable on mobile |

## Notable implementation details

- Business logic enforced at the **database level** via Postgres triggers and composite foreign keys (product limits per plan, category caps, subcategory-category consistency), not just in the UI.
- Four separate Supabase clients (browser, server, public/anonymous, admin) to keep row-level security and the service-role key properly scoped.
- Invite codes are claimed atomically (`UPDATE ... WHERE used_at IS NULL RETURNING ...`) so two simultaneous signups on the same link can't both succeed.
- All 47 Kenyan counties seeded, with admin-managed categories and subcategories enforced against their parent category in the schema.

## Running locally

```bash
npm install
cp .env.example .env   # fill in your own Supabase + Cloudinary values
npm run dev
```

Apply the SQL migrations in `supabase/migrations/` (in order) to a Supabase project before running the app.

```bash
npm run test       # Vitest unit tests
npm run typecheck   # TypeScript
npm run lint
```
