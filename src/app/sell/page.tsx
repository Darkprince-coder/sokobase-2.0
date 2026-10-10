import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Check, Link2, MessageCircle, PackagePlus, Smartphone, Store } from "lucide-react";
import Button from "@/components/Button";
import { getPlans } from "@/lib/catalog";
import { formatKes } from "@/lib/format";
import { sellWhatsappLink, site } from "@/lib/site";
import styles from "./sell.module.css";

// Safety net: server actions revalidate these pages on every change; this catches anything missed.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sell on SokoBase",
  description: "Get your business online in minutes. List your products, share one shop link everywhere, and receive orders directly on WhatsApp.",
  alternates: { canonical: "/sell" },
};

const steps = [
  { icon: Store, title: "Create your shop", text: "Sign up in about two minutes with your business name, location and WhatsApp number." },
  { icon: PackagePlus, title: "Add your products", text: "Add photos, prices, sizes and colours from your phone straight away, up to 10 while we review your shop." },
  { icon: BadgeCheck, title: "We approve, you go live", text: "SokoBase checks every new shop and agrees your plan with you, usually within a day." },
  { icon: Link2, title: "Share one link", text: "Put your shop link on WhatsApp status, Instagram, TikTok and flyers. Orders come straight to your WhatsApp." },
];

const faqs = [
  { q: "Is it free to sign up?", a: "Yes. Creating your shop and adding your first products is free. When we approve your shop, we agree your plan with you before it goes live." },
  { q: "Do customers pay through SokoBase?", a: "No. Customers tap Order on WhatsApp and chat with you directly. You agree on price, payment and delivery yourself, so you keep 100% of every sale." },
  { q: "Do I need a website or technical skills?", a: "No. If you can use WhatsApp, you can run your SokoBase shop. Everything works from your phone." },
  { q: "What happens when my plan ends?", a: "We remind you before it ends. Your shop stays visible for a short grace period, and renewing by M-Pesa keeps everything exactly as it was." },
  { q: "Can I change my plan later?", a: "Yes. Message us any time to move up or down a plan. Your products and shop link stay the same." },
];

export default async function SellPage() {
  const plans = await getPlans();
  const chat = sellWhatsappLink();
  const signup = `${site.portalUrl}/signup`;

  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>For Kenyan businesses</p>
          <h1>Your shop online. One link. Orders on WhatsApp.</h1>
          <p className={styles.lead}>No website to build, no commission on sales. List your products on {site.name} and let customers across Kenya find you and order directly.</p>
          <div className={styles.actions}>
            <Button href={signup} variant="accent" size="lg" icon={<ArrowRight size={20} />}>Start selling</Button>
            {chat && <Button href={chat} external variant="ghost" size="lg" icon={<MessageCircle size={20} />}>Questions? WhatsApp us</Button>}
          </div>
        </div>
        <ul className={styles.perks}>
          <li><Check size={18} aria-hidden="true" />Your own shop page: sokobase.co.ke/store/your-name</li>
          <li><Check size={18} aria-hidden="true" />Orders arrive in your WhatsApp, no middleman</li>
          <li><Check size={18} aria-hidden="true" />Manage everything from your phone</li>
          <li><Check size={18} aria-hidden="true" />0% commission on your sales</li>
        </ul>
      </section>

      <section className="container" aria-labelledby="how">
        <h2 id="how" className={styles.h2}>How it works</h2>
        <ol className={styles.steps}>
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={styles.step}>
              <span className={styles.stepIcon}><Icon size={20} aria-hidden="true" /></span>
              <span className={styles.stepNum}>Step {i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {plans.length > 0 && (
        <section className="container" aria-labelledby="plans">
          <h2 id="plans" className={styles.h2}>Plans</h2>
          <div className={styles.plans}>
            {plans.map((p, i) => {
              const link = `${signup}?plan=${encodeURIComponent(p.slug)}`;
              const featured = plans.length > 2 && i === 1;
              return (
                <article key={p.id} className={featured ? `${styles.plan} ${styles.featured}` : styles.plan}>
                  {featured && <span className={styles.popular}>Most popular</span>}
                  <h3>{p.name}</h3>
                  <p className={styles.price}>
                    {p.priceKes > 0 ? <>{formatKes(p.priceKes)}<span> / {p.durationDays} days</span></> : "Ask us"}
                  </p>
                  <ul>
                    <li><Check size={16} aria-hidden="true" />{p.productLimit ? `Up to ${p.productLimit} products` : "Unlimited products"}</li>
                    <li><Check size={16} aria-hidden="true" />Shop page and shareable link</li>
                    <li><Check size={16} aria-hidden="true" />WhatsApp ordering</li>
                    <li><Check size={16} aria-hidden="true" />Sizes, colours and options</li>
                  </ul>
                  <Button href={link} variant={featured ? "primary" : "outline"} fullWidth>Choose {p.name}</Button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="container" aria-labelledby="faq">
        <h2 id="faq" className={styles.h2}>Questions</h2>
        <div className={styles.faqs}>
          {faqs.map((f) => (
            <details key={f.q} className={styles.faq}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container">
        <div className={styles.cta}>
          <Smartphone size={28} aria-hidden="true" />
          <div>
            <h2>Ready to start selling?</h2>
            <p>Create your shop now and add your first products today.</p>
          </div>
          <Button href={signup} variant="accent" size="lg" icon={<ArrowRight size={20} />}>Start selling</Button>
        </div>
      </section>
    </div>
  );
}
