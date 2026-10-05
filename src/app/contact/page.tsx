import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import ContactLines from "@/components/ContactLines";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with SokoBase about listing your business, a problem with a listing, or anything else.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InfoPage title="Contact us" intro="The quickest way to reach us is WhatsApp.">
      <h2>Reach the SokoBase team</h2>
      <ContactLines />

      <h2>Questions about an order?</h2>
      <p>Orders are agreed directly with each business. Please contact the shop using the WhatsApp button on its page. If a seller isn&rsquo;t responding or something seems wrong, use <strong>Report this listing</strong> on the product or shop page.</p>

      <h2>Want to sell on SokoBase?</h2>
      <p>See plans and how joining works on the <Link href="/sell">Sell on SokoBase</Link> page.</p>

      <h2>Already a SokoBase business?</h2>
      <p>Sign in to your dashboard from the link in the footer. Forgot your password? Use &ldquo;Forgot password?&rdquo; on the sign-in page.</p>
    </InfoPage>
  );
}
