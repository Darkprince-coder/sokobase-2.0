import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "outline" | "accent" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";
type Base = { variant?: Variant; size?: Size; icon?: ReactNode; fullWidth?: boolean; className?: string; children: ReactNode };
type AsLink = Base & { href: string; external?: boolean };
type AsButton = Base & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

export default function Button(props: AsLink | AsButton) {
  const { variant = "primary", size = "md", icon, fullWidth, className, children, ...rest } = props;
  const cls = [styles.btn, styles[variant], styles[size], fullWidth ? styles.full : "", className ?? ""].filter(Boolean).join(" ");
  const content = (<>{icon}{children}</>);
  if ("href" in rest && rest.href) {
    const { href, external } = rest as { href: string; external?: boolean };
    return external ? (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{content}</a>
    ) : (
      <Link className={cls} href={href}>{content}</Link>
    );
  }
  return <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{content}</button>;
}
