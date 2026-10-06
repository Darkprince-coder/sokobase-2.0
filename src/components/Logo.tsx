import Link from "next/link";
import styles from "./Logo.module.css";

// Mark: two shops (one white, one ochre) standing on a shared base with an open doorway.
// Many small businesses, one home base, always open: that is SokoBase.
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#1F7A4D" />
      <rect x="11" y="11" width="11.5" height="11.5" rx="2.8" fill="#fff" />
      <rect x="25.5" y="11" width="11.5" height="11.5" rx="2.8" fill="#C97A2B" />
      <path d="M13.8 25.5h20.4a2.8 2.8 0 0 1 2.8 2.8v8.7H28v-4.6a4 4 0 0 0-8 0V37h-9v-8.7a2.8 2.8 0 0 1 2.8-2.8z" fill="#fff" />
    </svg>
  );
}

export default function Logo({ size = 36, tone = "dark", href = "/" }: { size?: number; tone?: "dark" | "light"; href?: string }) {
  return (
    <Link href={href} className={styles.logo} aria-label="SokoBase home">
      <LogoMark size={size} />
      <span className={`${styles.word} ${tone === "light" ? styles.light : ""}`} style={{ fontSize: size * 0.58 }}>
        Soko<span className={styles.base}>Base</span>
      </span>
    </Link>
  );
}
