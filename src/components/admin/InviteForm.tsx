"use client";
import { useActionState, useState } from "react";
import { MessageCircle } from "lucide-react";
import Button from "@/components/Button";
import CopyButton from "./CopyButton";
import { createInvite } from "@/app/admin/actions";
import { formatDate } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";
import styles from "./admin.module.css";

type Plan = { id: string; name: string; price_kes: number; duration_days: number };

export default function InviteForm({ plans }: { plans: Plan[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createInvite, {});
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === planId);
  const link = state.data?.link;
  const wa = link
    ? `https://wa.me/?text=${encodeURIComponent(`Welcome to SokoBase. Set up your shop here: ${link}\nThis link works once and expires on ${formatDate(state.data!.expires)}.`)}`
    : "";

  return (
    <div className={styles.form}>
      <form action={action} className={styles.form}>
        <div className={styles.grid2}>
          <label className={styles.field}>
            Plan
            <select name="plan_id" value={planId} onChange={(e) => setPlanId(e.target.value)} required>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (KSh {p.price_kes.toLocaleString("en-KE")})</option>)}
            </select>
          </label>
          <label className={styles.field}>
            Subscription length (days)
            <input key={planId} type="number" name="duration_days" min={1} max={365} defaultValue={plan?.duration_days ?? 30} required />
          </label>
          <label className={styles.field}>
            Link valid for (days)
            <input type="number" name="expires_in_days" min={1} max={60} defaultValue={7} required />
          </label>
          <label className={styles.field}>
            Issued to <span className={styles.hint}>(business or contact, for your records)</span>
            <input type="text" name="note" maxLength={120} placeholder="e.g. Ezekii Electronics, paid via M-Pesa" />
          </label>
        </div>
        {state.error && <p role="alert" className={styles.msgErr}>{state.error}</p>}
        <div><Button type="submit" disabled={pending}>{pending ? "Creating" : "Create invite"}</Button></div>
      </form>

      {state.ok && link && (
        <div className={styles.result} role="status">
          <span className={styles.hint}>Invite code</span>
          <span className={styles.code}>{state.data!.code}</span>
          <div className={styles.linkBox}>{link}</div>
          <div className={styles.btnRow}>
            <CopyButton value={link} label="Copy link" />
            <Button href={wa} external size="sm" variant="primary" icon={<MessageCircle size={15} />}>Send on WhatsApp</Button>
          </div>
        </div>
      )}
    </div>
  );
}
