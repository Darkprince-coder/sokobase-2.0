"use client";
import { useState } from "react";
import ActionForm from "./ActionForm";
import LogoUpload from "@/components/LogoUpload";
import { updateProfile } from "@/app/dashboard/actions";
import styles from "./dash.module.css";

type Category = { id: string; name: string };
type Business = { name: string; description: string | null; category_id: string | null; location: string; whatsapp: string; logo_url: string | null; cover_url: string | null };

export default function ProfileForm({ business, categories }: { business: Business; categories: Category[] }) {
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(business.cover_url ?? "");

  return (
    <ActionForm action={updateProfile} submitLabel="Save changes">
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="cover_url" value={coverUrl} />

      <div className={styles.field}>
        <span>Logo</span>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} />
      </div>
      <div className={styles.field}>
        <span>Cover photo (optional)</span>
        <LogoUpload value={coverUrl} onChange={setCoverUrl} />
      </div>

      <label className={styles.field}><span>Business name</span><input type="text" name="name" defaultValue={business.name} maxLength={80} required /></label>
      <label className={styles.field}><span>Description (optional)</span><textarea name="description" defaultValue={business.description ?? ""} maxLength={1000} rows={4} /></label>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Category</span>
          <select name="category_id" defaultValue={business.category_id ?? ""} required>
            <option value="" disabled>Choose one</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>Location</span><input type="text" name="location" defaultValue={business.location} maxLength={80} required /></label>
      </div>

      <label className={styles.field}>
        <span>WhatsApp number for orders</span>
        <input type="tel" name="whatsapp" defaultValue={business.whatsapp} inputMode="tel" required />
        <span className={styles.hint}>Customers message this number when they tap Order on WhatsApp.</span>
      </label>
    </ActionForm>
  );
}
