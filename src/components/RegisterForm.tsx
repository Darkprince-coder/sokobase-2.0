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
type County = { id: string; name: string };
const MAX_CATEGORIES = 3;

export default function RegisterForm({ code, categories, counties }: { code: string; categories: Category[]; counties: County[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerBusiness, {});
  const [logoUrl, setLogoUrl] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_CATEGORIES ? [...prev, id] : prev));
  };

  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="invite_code" value={code} />
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="category_ids" value={JSON.stringify(categoryIds)} />

      <div className={styles.field}>
        <span>Business logo</span>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} inviteCode={code} />
      </div>

      <label className={styles.field}>
        <span>Business name</span>
        <input type="text" name="name" maxLength={80} required autoComplete="organization" />
      </label>

      <div className={styles.field}>
        <span>Categories <span className={styles.hint}>(choose up to {MAX_CATEGORIES})</span></span>
        <div className={styles.checkGrid}>
          {categories.map((c) => {
            const checked = categoryIds.includes(c.id);
            const disabled = !checked && categoryIds.length >= MAX_CATEGORIES;
            return (
              <label key={c.id} className={`${styles.checkTile} ${checked ? styles.checkTileOn : ""}`}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCategory(c.id)} />
                {c.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>County</span>
          <select name="county_id" required defaultValue="">
            <option value="" disabled>Choose your county</option>
            {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Specific location</span>
          <input type="text" name="location" maxLength={80} placeholder="e.g. Nairobi CBD, Tom Mboya St" required />
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
