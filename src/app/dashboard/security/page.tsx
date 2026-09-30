import type { Metadata } from "next";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import styles from "@/components/dashboard/dash.module.css";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <>
      <header className={styles.head}><h1>Security</h1><p className={styles.sub}>Change your password. You'll need your current one.</p></header>
      <section className={styles.panel}>
        <ChangePasswordForm />
      </section>
    </>
  );
}
