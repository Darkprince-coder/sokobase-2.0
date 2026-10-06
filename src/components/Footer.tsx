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
        </nav>
        <nav aria-label="Help" className={styles.col}>
          <h3>Help</h3>
          <Link href="/about">About SokoBase</Link>
          <Link href="/contact">Contact us</Link>
          {site.supportWhatsapp && <a href={whatsappLink(site.supportWhatsapp, "Hi SokoBase")} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
        </nav>
      </div>
      <div className={`container ${styles.copy}`}>
        <span>&copy; {new Date().getFullYear()} {site.legalName}. All rights reserved.</span>
        <span className={styles.legal}><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Use</Link></span>
      </div>
    </footer>
  );
}
