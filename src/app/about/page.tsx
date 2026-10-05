import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "About SokoBase",
  description: "SokoBase helps Kenyan businesses get online with one shareable shop link, and lets shoppers order directly on WhatsApp.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InfoPage title="About SokoBase" intro="A simple online marketplace for Kenyan businesses: one link for your shop, orders straight to your WhatsApp.">
      <h2>Why we built it</h2>
      <p>Most small businesses in Kenya already sell on WhatsApp, but customers struggle to see everything a shop offers, compare prices, or find shops near them. Building a website is expensive and slow. SokoBase gives every business a professional shop page they can share everywhere, without the cost.</p>

      <h2>How it works for shoppers</h2>
      <ul>
        <li>Browse products and shops across all 47 counties, no account needed.</li>
        <li>Save items you like with the heart button.</li>
        <li>Tap <strong>Order on WhatsApp</strong> to chat with the seller directly and agree on price, payment and delivery.</li>
      </ul>

      <h2>How it works for businesses</h2>
      <ul>
        <li>Get your own shop page with your logo, products, prices, sizes and colours.</li>
        <li>Share one link on your WhatsApp status, Instagram, TikTok, Facebook and flyers, or print your shop QR code.</li>
        <li>Customers message you directly. You keep 100% of every sale, with no commission.</li>
      </ul>
      <p><Link href="/sell">See plans and how to join</Link>.</p>

      <h2>Trust and safety</h2>
      <p>Every business joins by personal invitation after speaking with our team. Shops marked with a verified badge have passed additional checks. Anyone can report a listing, and we review every report. Read our tips in the <Link href="/terms">Terms of Use</Link>.</p>
    </InfoPage>
  );
}
