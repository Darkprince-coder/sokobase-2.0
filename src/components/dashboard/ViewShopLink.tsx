"use client";
import { useId, useRef } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import Button from "@/components/Button";
import type { ShopVisibility } from "@/lib/dashboard";
import styles from "./dash.module.css";

// "View my shop": opens the public page while customers can see it. When the shop is hidden the
// public page would say "not found", so explain why instead and offer the way back.
type Props = { href: string; visibility: ShopVisibility; endedOn: string | null; renewHref: string | null; asButton?: boolean };

export default function ViewShopLink({ href, visibility, endedOn, renewHref, asButton }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  if (visibility === "public") {
    return asButton
      ? <Button href={href} external size="sm" variant="outline" icon={<Eye size={15} />}>View shop</Button>
      : <a href={href} target="_blank" rel="noopener noreferrer">View my shop</a>;
  }
  const open = () => dialog.current?.showModal();

  const copy = {
    suspended: { title: "Your shop is paused", text: "SokoBase has paused your shop, so customers can't see it right now. Your products are saved. Message us to sort it out.", cta: "Message SokoBase" },
    expired: { title: "Your shop is hidden", text: `Your plan ended${endedOn ? ` on ${endedOn}` : ""}, so customers can't see your shop right now. Your products are saved and come back as soon as you renew.`, cta: "Renew on WhatsApp" },
    pending: { title: "Waiting for approval", text: "SokoBase is checking your shop, usually within a day. Customers can't see it yet. Add your products now (up to 10) so it's ready the moment it goes live. We'll email you when it's approved.", cta: "Message SokoBase" },
    "no-plan": { title: "Your shop isn't live yet", text: "Your shop needs an active plan before customers can see it. Your products are saved. Message us to get started.", cta: "Message SokoBase" },
  }[visibility];

  return (
    <>
      {asButton
        ? <Button type="button" size="sm" variant="outline" icon={<EyeOff size={15} />} onClick={open}>Shop hidden</Button>
        : <button type="button" onClick={open}>View my shop</button>}
      <dialog ref={dialog} className={styles.notice} aria-labelledby={titleId} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
        <div className={styles.noticeBody}>
          <button type="button" className={styles.noticeClose} aria-label="Close" onClick={() => dialog.current?.close()}><X size={18} /></button>
          <span className={styles.noticeIcon}><EyeOff size={22} aria-hidden="true" /></span>
          <h2 id={titleId}>{copy.title}</h2>
          <p>{copy.text}</p>
          {renewHref && <a className={styles.noticeCta} href={renewHref} target="_blank" rel="noopener noreferrer">{copy.cta}</a>}
        </div>
      </dialog>
    </>
  );
}
