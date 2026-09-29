"use client";
import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Button from "./Button";
import LogoUpload from "./LogoUpload";
import { registerBusiness } from "@/app/join/actions";
import type { ActionState } from "@/lib/action-state";
import styles from "./RegisterForm.module.css";

type Category = { id: string; name: string };

export default function RegisterForm({ code, categories }: { code: string; categories: Category[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerBusiness, {});
  const [logoUrl, setLogoUrl] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="invite_code" value={code} />
      <input type="hidden" name="logo_url" value={logoUrl} />

      <div className={styles.field}>
        <span>Business logo</span>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} />
      </div>

      <label className={styles.field}>
        <span>Business name</span>
        <input type="text" name="name" maxLength={80} required autoComplete="organization" />
      </label>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Category</span>
          <select name="category_id" required defaultValue="">
            <option value="" disabled>Choose one</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Location</span>
          <input type="text" name="location" maxLength={80} placeholder="e.g. Nairobi CBD" required />
        </label>
      </div>

      <label className={styles.field}>
        <span>WhatsApp number for customer orders</span>
        <input type="tel" name="whatsapp" placeholder="07XX XXX XXX" inputMode="tel" required />
        <span className={styles.hint}>Customers message this number directly when they order. Use a number you check often.</span>
      </label>

      <label className={styles.field}>
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" inputMode="email" required />
      </label>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Password</span>
          <div className={styles.pw}>
            <input type={showPw ? "text" : "password"} name="password" autoComplete="new-password" minLength={10} required />
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        <label className={styles.field}>
          <span>Confirm password</span>
          <input type={showPw ? "text" : "password"} name="confirm_password" autoComplete="new-password" minLength={10} required />
        </label>
      </div>

      <AnimatePresence>
        {state.error && (
          <motion.p role="alert" className={styles.error} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" size="lg" fullWidth disabled={pending} icon={pending ? <Loader2 size={18} className={styles.spin} /> : undefined}>
        {pending ? "Creating your shop" : "Create my shop"}
      </Button>
    </form>
  );
}
