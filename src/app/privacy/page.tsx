import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import ContactLines from "@/components/ContactLines";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SokoBase collects, uses and protects personal data, in line with the Kenya Data Protection Act, 2019.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated="5 October 2026"
      intro={`This policy explains what personal data ${site.legalName} ("SokoBase", "we") collects, why, and the choices you have. We follow the Kenya Data Protection Act, 2019.`}>
      <h2>Who this applies to</h2>
      <p><strong>Shoppers</strong> who browse sokobase.co.ke, and <strong>businesses</strong> that list products on SokoBase. SokoBase is a listing platform: when you order, you deal directly with the business on WhatsApp.</p>

      <h2>Shoppers: what we collect</h2>
      <ul>
        <li><strong>No account is needed.</strong> We do not ask for your name, phone number or email to browse or order.</li>
        <li><strong>Saved items</strong> are stored only on your own device (in your browser). We never receive them.</li>
        <li><strong>Order taps:</strong> when you tap &ldquo;Order on WhatsApp&rdquo; we record which product and shop, the time, and an anonymous code made by scrambling your IP address and browser details. This code changes every day and cannot be turned back into your IP address. We use it only to count orders fairly and stop abuse.</li>
        <li><strong>Reports:</strong> if you report a listing we keep what you write and, only if you choose to give it, a phone number or email so we can follow up.</li>
        <li><strong>Analytics:</strong> we use Google Analytics to understand which pages are used, which sets cookies in your browser. You can block these cookies in your browser settings without affecting how the site works.</li>
        <li><strong>WhatsApp conversations</strong> happen in WhatsApp, between you and the business. SokoBase does not see them. WhatsApp&rsquo;s own privacy policy applies.</li>
      </ul>

      <h2>Businesses: what we collect</h2>
      <ul>
        <li>Account details: email address and password (stored securely as a one-way hash; we can never see it).</li>
        <li>Shop details you publish: business name, description, logo and photos, county and location, WhatsApp number, categories and product listings. These are <strong>public</strong> by design.</li>
        <li>Subscription records: plan, dates, amount paid and M-Pesa transaction codes you share with us.</li>
        <li>Order-tap counts for your shop (anonymous, as described above).</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the marketplace: show shops and products, let shoppers contact businesses, and keep the site secure.</li>
        <li>To manage business accounts and subscriptions, and send service messages such as password-reset emails and renewal reminders.</li>
        <li>To prevent fraud, spam and abuse, and to act on reports.</li>
        <li>To improve SokoBase using anonymous statistics.</li>
      </ul>
      <p>Our legal bases are performing our agreement with businesses, our legitimate interest in running a safe marketplace, and your consent where required (for example analytics cookies).</p>

      <h2>Who we share it with</h2>
      <p>We do not sell personal data. We use trusted service providers who process data on our behalf:</p>
      <ul>
        <li>Supabase (database and sign-in), Vercel (website hosting), Cloudinary (image storage), Resend (email delivery), Cloudflare (bot protection) and Google (analytics).</li>
      </ul>
      <p>Some of these providers store data outside Kenya. Where that happens we rely on providers that offer appropriate safeguards, as the Act requires. We may also disclose data where the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>Business account and shop data is kept while the account is active and for a reasonable period afterwards for accounting and dispute purposes. Subscription and payment records are kept as long as tax law requires. Anonymous order statistics may be kept longer because they do not identify anyone.</p>

      <h2>Your rights</h2>
      <p>Under the Data Protection Act you can ask to access, correct or delete your personal data, object to its use, or ask for a copy in a portable format. Businesses can correct most details themselves in their dashboard. To make a request, contact us below. If you are unhappy with our answer you may complain to the Office of the Data Protection Commissioner (odpc.go.ke).</p>

      <h2>Security</h2>
      <p>We protect data with encrypted connections, strict access rules in our database, and limited staff access. No system is perfectly secure, so please use a strong, unique password for your business account.</p>

      <h2>Children</h2>
      <p>SokoBase is not directed at children under 18, and business accounts are only for adults.</p>

      <h2>Changes</h2>
      <p>We may update this policy. The date at the top shows the latest version; important changes will be announced on the site or to businesses directly.</p>

      <h2>Contact</h2>
      <p>For privacy questions or requests:</p>
      <ContactLines topic="Hi SokoBase, I have a privacy question." />
      <p>See also our <Link href="/terms">Terms of Use</Link>.</p>
    </InfoPage>
  );
}
