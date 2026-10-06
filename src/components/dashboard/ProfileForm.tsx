"use client";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, MapPin, Store as StoreIcon } from "lucide-react";
import LogoUpload from "@/components/LogoUpload";
import { updateProfile } from "@/app/dashboard/actions";
import { normalizeKePhone } from "@/lib/phone";
import { whatsappLink } from "@/lib/site";
import type { ActionState } from "@/lib/action-state";
import f from "./ProductForm.module.css";
import styles from "./ProfileForm.module.css";
import { keepFormSubmit } from "@/lib/keep-form";

const MAX_CATEGORIES = 3;
type Category = { id: string; name: string };
type County = { id: string; name: string };
type Business = { name: string; description: string | null; location: string; whatsapp: string; logo_url: string | null; cover_url: string | null; county_id: string | null; category_ids: string[] };

// Shop profile in plain steps with a live preview of the shop header.
export default function ProfileForm({ business, categories, counties }: { business: Business; categories: Category[]; counties: County[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  const [name, setName] = useState(business.name);
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(business.cover_url ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(business.category_ids);
  const [countyId, setCountyId] = useState(business.county_id ?? "");
  const [location, setLocation] = useState(business.location);
  const [whatsapp, setWhatsapp] = useState(business.whatsapp.replace(/^254/, "0"));
  const err = (field: string) => (state.field === field ? state.error : undefined);

  useEffect(() => {
    if (!state.error) return;
    document.getElementById(state.field ? `p-${state.field}` : "p-top")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_CATEGORIES ? [...prev, id] : prev));
  const county = counties.find((c) => c.id === countyId)?.name;
  const phone = normalizeKePhone(whatsapp);
  const img = (url: string, t: string) => url.replace("/image/upload/", `/image/upload/${t},f_auto,q_auto/`);

  return (
    <form onSubmit={keepFormSubmit(action)} className={f.form} noValidate>
      <span id="p-top" />
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="cover_url" value={coverUrl} />
      <input type="hidden" name="category_ids" value={JSON.stringify(categoryIds)} />
      {state.ok && state.message && <p className={f.success} role="status"><CheckCircle2 size={18} aria-hidden="true" /> {state.message}</p>}

      <section className={f.step} id="p-logo_url">
        <h2><span className={f.num}>1</span> How your shop looks</h2>
        <div className={styles.preview} aria-label="Preview of your shop header">
          <div className={styles.cover}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {coverUrl ? <img src={img(coverUrl, "c_fill,g_auto,w_900,h_320")} alt="" /> : <span>Your cover photo appears here</span>}
          </div>
          <div className={styles.head}>
            <span className={styles.logo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? <img src={img(logoUrl, "c_pad,b_white,w_160,h_160")} alt="" /> : <StoreIcon size={26} aria-hidden="true" />}
            </span>
            <span className={styles.who}>
              <strong>{name || "Your shop name"}</strong>
              <small><MapPin size={12} aria-hidden="true" />{[location, county].filter(Boolean).join(", ") || "Your location"}</small>
            </span>
          </div>
        </div>
        <div className={f.grid2}>
          <div className={f.field}><span>Logo</span><LogoUpload value={logoUrl} onChange={setLogoUrl} /></div>
          <div className={f.field}><span>Cover photo</span><LogoUpload value={coverUrl} onChange={setCoverUrl} label="cover photo" />
            <span className={f.hint}>A wide photo of your shop, products or team.</span></div>
        </div>
      </section>

      <section className={f.step}>
        <h2><span className={f.num}>2</span> About your shop</h2>
        <label className={f.field} id="p-name">
          <span>Shop name</span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={!!err("name")} />
          {err("name") && <em role="alert" className={f.fieldError}>{err("name")}</em>}
        </label>
        <label className={f.field} id="p-description">
          <span>Describe your shop</span>
          <textarea name="description" defaultValue={business.description ?? ""} maxLength={1000} rows={4}
            placeholder="What you sell, where you deliver, opening hours. e.g. Quality furniture made in Kimana. Free delivery within town, countrywide by courier. Open Mon to Sat, 8am to 7pm." />
          <span className={f.hint}>Shops with a clear description get more orders.</span>
          {err("description") && <em role="alert" className={f.fieldError}>{err("description")}</em>}
        </label>
        <div className={f.field} id="p-category_ids">
          <span>What do you sell? <small className={styles.light}>(up to {MAX_CATEGORIES})</small></span>
          <div className={styles.cats}>
            {categories.map((c) => {
              const on = categoryIds.includes(c.id);
              const disabled = !on && categoryIds.length >= MAX_CATEGORIES;
              return <button key={c.id} type="button" aria-pressed={on} disabled={disabled} className={on ? styles.catOn : styles.cat} onClick={() => toggleCategory(c.id)}>{c.name}</button>;
            })}
          </div>
          {err("category_ids") && <em role="alert" className={f.fieldError}>{err("category_ids")}</em>}
        </div>
      </section>

      <section className={f.step}>
        <h2><span className={f.num}>3</span> Location and orders</h2>
        <div className={f.grid2}>
          <label className={f.field} id="p-county_id">
            <span>County</span>
            <select name="county_id" value={countyId} onChange={(e) => setCountyId(e.target.value)} aria-invalid={!!err("county_id")}>
              <option value="" disabled>Choose your county</option>
              {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {err("county_id") && <em role="alert" className={f.fieldError}>{err("county_id")}</em>}
          </label>
          <label className={f.field} id="p-location">
            <span>Town or area</span>
            <input name="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="e.g. Kimana town, near the stage" aria-invalid={!!err("location")} />
            {err("location") && <em role="alert" className={f.fieldError}>{err("location")}</em>}
          </label>
        </div>
        <label className={f.field} id="p-whatsapp">
          <span>WhatsApp number for orders</span>
          <input type="tel" name="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="0712 345 678" aria-invalid={!!err("whatsapp")} />
          <span className={f.hint}>Every &ldquo;Order on WhatsApp&rdquo; tap opens a chat with this number.</span>
          {phone && <a className={f.linkBtn} href={whatsappLink(phone, "Testing my SokoBase order button")} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Test this number on WhatsApp</a>}
          {whatsapp && !phone && <em className={f.fieldError}>This doesn&apos;t look like a Kenyan mobile number yet.</em>}
          {err("whatsapp") && <em role="alert" className={f.fieldError}>{err("whatsapp")}</em>}
        </label>
      </section>

      <div className={`${f.saveBar} ${styles.aboveTabs}`}>
        {state.error && <p role="alert" className={f.barError}>{state.field ? "Please fix the highlighted item above." : state.error}</p>}
        <div className={styles.saveOne}>
          <button type="submit" className={f.publishBtn} disabled={pending}>
            {pending ? <><Loader2 size={18} className={f.spin} aria-hidden="true" /> Saving…</> : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
