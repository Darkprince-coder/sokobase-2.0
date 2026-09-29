import { ShieldCheck, MessageCircle, Store, Heart } from "lucide-react";
import styles from "./TrustStrip.module.css";

const ITEMS = [
  { Icon: ShieldCheck, title: "Verified businesses", text: "Every shop is reviewed before going live" },
  { Icon: MessageCircle, title: "Order on WhatsApp", text: "Chat with the seller, no account needed" },
  { Icon: Store, title: "Shops across Kenya", text: "Products and services in one place" },
  { Icon: Heart, title: "Save your favourites", text: "Keep a wishlist on your phone" },
];

export default function TrustStrip() {
  return (
    <section className="container" aria-label="Why SokoBase">
      <ul className={styles.strip}>
        {ITEMS.map(({ Icon, title, text }) => (
          <li key={title} className={styles.item}>
            <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
            <div><strong>{title}</strong><p>{text}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
