"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Button from "@/components/Button";
import type { ActionState } from "@/lib/action-state";
import styles from "./dash.module.css";
import { keepFormSubmit } from "@/lib/keep-form";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "outline" | "soft";
};

export default function ActionForm({ action, children, submitLabel, resetOnSuccess = false, variant = "primary" }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);

  return (
    <form ref={ref} onSubmit={keepFormSubmit(formAction)} className={styles.form}>
      {children}
      <AnimatePresence mode="wait">
        {(state.error || state.message) && (
          <motion.p key={state.error ?? state.message} role={state.error ? "alert" : "status"} className={state.error ? styles.msgErr : styles.msgOk}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {state.error ?? state.message}
          </motion.p>
        )}
      </AnimatePresence>
      <div>
        <Button type="submit" variant={variant} size="md" disabled={pending} icon={pending ? <Loader2 size={16} className={styles.spin} /> : undefined}>
          {pending ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
