"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Button from "./Button";
import Turnstile from "./Turnstile";
import { requestPasswordReset, resetPassword, type LoginState } from "@/app/login/actions";
import styles from "./LoginForm.module.css";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestPasswordReset, {});
  if (state.message) {
    return (
      <div className={styles.form}>
        <p role="status" className={styles.notice}>{state.message}</p>
        <div className={styles.links}><Link href="/login">Back to sign in</Link></div>
      </div>
    );
  }
  return (
    <form action={action} className={styles.form} noValidate>
      <label className={styles.field}>
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" inputMode="email" required />
      </label>
      <Turnstile resetKey={state.attempt} />
      {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
      <Button type="submit" size="lg" fullWidth disabled={pending} icon={pending ? <Loader2 size={18} className={styles.spin} /> : undefined}>
        {pending ? "Sending" : "Send reset link"}
      </Button>
      <div className={styles.links}><Link href="/login">Back to sign in</Link></div>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(resetPassword, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className={styles.form} noValidate>
      <label className={styles.field}>
        <span>New password</span>
        <div className={styles.pw}>
          <input type={show ? "text" : "password"} name="password" autoComplete="new-password" minLength={10} required />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      <label className={styles.field}>
        <span>Confirm new password</span>
        <input type={show ? "text" : "password"} name="confirm_password" autoComplete="new-password" required />
      </label>
      {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
      <Button type="submit" size="lg" fullWidth disabled={pending} icon={pending ? <Loader2 size={18} className={styles.spin} /> : undefined}>
        {pending ? "Saving" : "Set new password"}
      </Button>
    </form>
  );
}
