import Link from "next/link";
import Logo from "./Logo";
import InstallButton from "./InstallButton";
import { site, whatsappLink } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo size={38} tone="light" />
          <p>Shop products and services from verified businesses across Kenya, and order directly on WhatsApp.</p>
          <InstallButton />
        </div>
        <nav aria-label="Shop" className={styles.col}>
          <h3>Shop</h3>
          <Link href="/products">Browse products</Link>
          <Link href="/products?badge=hot">Hot deals</Link>
          <Link href="/stores">Shops</Link>
          <Link href="/saved">Saved items</Link>
        </nav>
        <nav aria-label="Sell" className={styles.col}>
          <h3>Sell</h3>
          <Link href="/sell">List your business</Link>
          <a href={`${site.portalUrl}/login`} rel="nofollow">Business sign in</a>
          {site.supportWhatsapp && <a href={whatsappLink(site.supportWhatsapp, "Hi SokoBase")} target="_blank" rel="noopener noreferrer">Chat with SokoBase</a>}
        </nav>
      </div>
      <div className={`container ${styles.copy}`}>&copy; {new Date().getFullYear()} SokoBase. All rights reserved.</div>
    </footer>
  );
}
