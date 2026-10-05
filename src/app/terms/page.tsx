import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import ContactLines from "@/components/ContactLines";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for shopping and selling on SokoBase.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" updated="5 October 2026"
      intro={`These terms apply to everyone who uses SokoBase, operated by ${site.legalName}. By using the site you agree to them.`}>
      <h2>1. What SokoBase is</h2>
      <p>SokoBase is an online directory where Kenyan businesses list products and services, and shoppers contact them directly on WhatsApp. <strong>SokoBase does not sell, stock, deliver or take payment for any item.</strong> Every sale is an agreement between the shopper and the business.</p>

      <h2>2. For shoppers</h2>
      <ul>
        <li>Confirm the item, price, condition, delivery and returns with the business before paying.</li>
        <li>Where possible, pay on delivery or when collecting from the shop. Be careful with requests to pay in advance to unfamiliar sellers.</li>
        <li>Prices and stock shown are provided by each business and may change. The business confirms the final price.</li>
        <li>If a listing looks wrong or suspicious, use &ldquo;Report this listing&rdquo; so we can review it.</li>
      </ul>

      <h2>3. For businesses</h2>
      <ul>
        <li>You must be at least 18, run a genuine business, and give accurate information about it.</li>
        <li>Your listings must be truthful: real photos, correct prices and honest descriptions. Mark items out of stock when they are.</li>
        <li>You must own, or have permission to use, every photo and text you upload.</li>
        <li>You are responsible for your sales, deliveries, refunds and customer service, and for following Kenyan law, including the Consumer Protection Act and any licences your business needs.</li>
        <li>Keep your login details private. You are responsible for activity on your account.</li>
      </ul>

      <h2>4. Items that are not allowed</h2>
      <p>You may not list anything illegal in Kenya, or: counterfeit or stolen goods; weapons and ammunition; drugs and prescription medicines without the required licence; wildlife and wildlife products; adult or sexual content; or any item or service intended to deceive people. We may remove any listing we consider unsafe or inappropriate.</p>

      <h2>5. Subscriptions and payment</h2>
      <ul>
        <li>Business plans are paid in advance (currently by M-Pesa) for the period agreed when you subscribe or renew.</li>
        <li>When a plan ends you cannot edit your shop. Your shop stays visible for a 7-day grace period, then is hidden from shoppers until you renew. Your products are kept and return when you renew.</li>
        <li>Fees are not refundable once a period has started, except where we decide otherwise or the law requires it.</li>
        <li>We may change plan prices or limits. Changes apply from your next renewal.</li>
      </ul>

      <h2>6. The verified badge</h2>
      <p>A verified badge means SokoBase carried out basic checks that the business exists. It is not a guarantee of any product, sale or behaviour. Always use your own judgement.</p>

      <h2>7. Your content</h2>
      <p>You keep ownership of what you upload. You allow SokoBase to display, resize and share it on SokoBase and in promoting SokoBase, for as long as it is listed.</p>

      <h2>8. Suspension and removal</h2>
      <p>We may remove listings, or suspend or close an account, if these terms are broken, if we receive credible reports of fraud or harm, or if the law requires it. Where reasonable we will tell you why.</p>

      <h2>9. Liability</h2>
      <p>SokoBase is provided &ldquo;as is&rdquo;. We work to keep it available and accurate, but we are not responsible for the products, services, statements or conduct of businesses or shoppers, or for losses arising from a sale between them. Nothing in these terms limits rights you have under Kenyan consumer law that cannot be excluded.</p>

      <h2>10. Changes and law</h2>
      <p>We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of Kenya, and disputes will be handled by the courts of Kenya.</p>

      <h2>Contact</h2>
      <ContactLines topic="Hi SokoBase, I have a question about the terms." />
      <p>See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </InfoPage>
  );
}
