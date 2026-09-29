import Link from "next/link";
import { Store, MessageCircle } from "lucide-react";
import styles from "./PromoTiles.module.css";

export default function PromoTiles() {
  return (
    <div className={styles.tiles}>
      <Link href="/join" className={`${styles.tile} ${styles.sell}`}>
        <Store size={26} aria-hidden="true" />
        <strong>Sell on SokoBase</strong>
        <span>Get your shop online and share one link with every customer.</span>
      </Link>
      <div className={`${styles.tile} ${styles.info}`}>
        <MessageCircle size={26} aria-hidden="true" />
        <strong>Order on WhatsApp</strong>
        <span>Chat with the seller directly to confirm price and delivery.</span>
      </div>
    </div>
  );
}
