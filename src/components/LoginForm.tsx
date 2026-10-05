"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Button from "./Button";
import Turnstile from "./Turnstile";
import { login, type LoginState } from "@/app/login/actions";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className={styles.form} noValidate>
      <label className={styles.field}>
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" required inputMode="email" />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <div className={styles.pw}>
          <input type={show ? "text" : "password"} name="password" autoComplete="current-password" required />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      <div className={styles.links}><span /><Link href="/forgot-password">Forgot password?</Link></div>
      <Turnstile resetKey={state.attempt} />
      <AnimatePresence>
        {state.error && (
          <motion.p role="alert" className={styles.error} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>
      <Button type="submit" size="lg" fullWidth disabled={pending} icon={pending ? <Loader2 size={18} className={styles.spin} /> : undefined}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
