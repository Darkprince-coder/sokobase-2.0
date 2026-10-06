"use client";
import { useActionState, useRef } from "react";
import { Flag, X } from "lucide-react";
import Button from "./Button";
import { submitReport, type ReportState } from "@/app/report/actions";
import styles from "./ReportListing.module.css";
import { keepFormSubmit } from "@/lib/keep-form";

const REASONS = [
  { value: "scam", label: "Looks like a scam or fraud" },
  { value: "wrong_info", label: "Wrong price, photos or details" },
  { value: "prohibited", label: "Illegal or prohibited item" },
  { value: "unreachable", label: "Seller doesn't respond on WhatsApp" },
  { value: "other", label: "Something else" },
];

export default function ReportListing({ businessId, productId, label = "Report this listing" }: { businessId: string; productId?: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => dialog.current?.showModal()}>
        <Flag size={14} aria-hidden="true" /> {label}
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="report-title" onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <div className={styles.body}>
          <header className={styles.head}>
            <h2 id="report-title">{state.ok ? "Thank you" : label}</h2>
            <button type="button" className={styles.close} aria-label="Close" onClick={close}><X size={18} /></button>
          </header>
          {state.ok ? (
            <>
              <p className={styles.text}>Your report has been sent to the SokoBase team. We review every report and take action where needed.</p>
              <Button type="button" onClick={close}>Close</Button>
            </>
          ) : (
            <form onSubmit={keepFormSubmit(action)} className={styles.form}>
              <input type="hidden" name="business_id" value={businessId} />
              {productId && <input type="hidden" name="product_id" value={productId} />}
              <fieldset className={styles.reasons}>
                <legend>What is wrong?</legend>
                {REASONS.map((r) => (
                  <label key={r.value} className={styles.reason}><input type="radio" name="reason" value={r.value} required /> {r.label}</label>
                ))}
              </fieldset>
              <label className={styles.field}><span>Details (optional)</span><textarea name="details" rows={3} maxLength={500} /></label>
              <label className={styles.field}><span>Your phone or email (optional, if we may contact you)</span><input name="contact" maxLength={80} autoComplete="tel" /></label>
              {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
              <Button type="submit" disabled={pending} fullWidth>{pending ? "Sending…" : "Send report"}</Button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
