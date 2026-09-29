import Link from "next/link";
import styles from "./Logo.module.css";

// Mark: a shopping bag (commerce) carrying an S (SokoBase). The handle is the shared roof
// every business on the platform sits under. The green rounded base is the "Base".
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#1F7A4D" />
      <path d="M16 20.5C16 9.5 32 9.5 32 20.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M11.5 20h25l1.9 17.2a3 3 0 0 1-2.4 3H12a3 3 0 0 1-2.4-3z" fill="#fff" />
      <path d="M28 26.4C28 24.3 20 24.1 20 27.6c0 3.6 8 1.8 8 5.5 0 3.5-8 3.3-8 1.1" fill="none" stroke="#1F7A4D" strokeWidth="2.6" strokeLinecap="round" />
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
