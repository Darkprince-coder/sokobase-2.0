"use client";
import { useState } from "react";
import ActionForm from "./ActionForm";
import { changePassword } from "@/app/dashboard/actions";
import styles from "./dash.module.css";

export default function ChangePasswordForm() {
  const [show, setShow] = useState(false);
  return (
    <ActionForm action={changePassword} submitLabel="Update password" resetOnSuccess>
      <label className={styles.field}>
        <span>Current password</span>
        <div style={{ position: "relative" }}>
          <input type={show ? "text" : "password"} name="current_password" autoComplete="current-password" required />
        </div>
      </label>
      <label className={styles.field}><span>New password</span><input type={show ? "text" : "password"} name="new_password" autoComplete="new-password" minLength={10} required /></label>
      <label className={styles.field}><span>Confirm new password</span><input type={show ? "text" : "password"} name="confirm_password" autoComplete="new-password" minLength={10} required /></label>
      <label className={styles.check}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Show passwords
      </label>
    </ActionForm>
  );
}
