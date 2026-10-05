"use client";
import { useState } from "react";
import ActionForm from "./ActionForm";
import LogoUpload from "@/components/LogoUpload";
import { updateProfile } from "@/app/dashboard/actions";
import styles from "./dash.module.css";

const MAX_CATEGORIES = 3;
type Category = { id: string; name: string };
type County = { id: string; name: string };
type Business = { name: string; description: string | null; location: string; whatsapp: string; logo_url: string | null; cover_url: string | null; county_id: string | null; category_ids: string[] };

export default function ProfileForm({ business, categories, counties }: { business: Business; categories: Category[]; counties: County[] }) {
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(business.cover_url ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(business.category_ids);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_CATEGORIES ? [...prev, id] : prev));
  };

  return (
    <ActionForm action={updateProfile} submitLabel="Save changes">
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="cover_url" value={coverUrl} />
      <input type="hidden" name="category_ids" value={JSON.stringify(categoryIds)} />

      <div className={styles.field}>
        <span>Logo</span>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} />
      </div>
      <div className={styles.field}>
        <span>Cover photo (optional)</span>
        <LogoUpload value={coverUrl} onChange={setCoverUrl} label="cover photo" />
      </div>

      <label className={styles.field}><span>Business name</span><input type="text" name="name" defaultValue={business.name} maxLength={80} required /></label>
      <label className={styles.field}><span>Description (optional)</span><textarea name="description" defaultValue={business.description ?? ""} maxLength={1000} rows={4} /></label>

      <div className={styles.field}>
        <span>Categories (choose up to {MAX_CATEGORIES})</span>
        <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {categories.map((c) => {
            const checked = categoryIds.includes(c.id);
            const disabled = !checked && categoryIds.length >= MAX_CATEGORIES;
            return (
              <label key={c.id} className={styles.check} style={{ border: "1.5px solid var(--line)", borderRadius: "var(--radius-md)", padding: "9px 12px", opacity: disabled ? 0.5 : 1 }}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCategory(c.id)} /> {c.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>County</span>
          <select name="county_id" defaultValue={business.county_id ?? ""} required>
            <option value="" disabled>Choose your county</option>
            {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>Specific location</span><input type="text" name="location" defaultValue={business.location} maxLength={80} required /></label>
      </div>

      <label className={styles.field}>
        <span>WhatsApp number for orders</span>
        <input type="tel" name="whatsapp" defaultValue={business.whatsapp} inputMode="tel" required />
        <span className={styles.hint}>Customers message this number when they tap Order on WhatsApp.</span>
      </label>
    </ActionForm>
  );
}
