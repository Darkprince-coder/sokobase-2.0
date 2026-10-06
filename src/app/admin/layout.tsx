import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import AdminNav from "@/components/admin/AdminNav";
import { requireSuperAdmin } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import styles from "@/components/admin/admin.module.css";
import { portalAppMetadata, portalViewport } from "@/lib/portal-app";

export const metadata: Metadata = { ...portalAppMetadata, title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };
export const viewport = portalViewport;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSuperAdmin();
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}><Logo size={30} tone="light" /><span className={styles.tag}>Admin</span></div>
        <AdminNav />
        <div className={styles.sideFoot}>
          <span className={styles.userMail}>{user.email}</span>
          <Link href="/">View site</Link>
          <form action={signOut}><button type="submit">Sign out</button></form>
        </div>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
