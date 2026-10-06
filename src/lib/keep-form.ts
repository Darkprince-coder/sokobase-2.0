"use client";
import { startTransition, type FormEvent } from "react";

// React clears a <form action={...}> after every submit, so a failed save would wipe what the
// person typed. Submitting through onSubmit instead keeps every field as it is. The optional
// `check` runs first (e.g. the same validation rules as the server): return false to stop.
export function keepFormSubmit(action: (fd: FormData) => void, check?: (fd: FormData) => boolean) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget, submitter); // includes the pressed button (e.g. intent=draft)
    if (check && !check(fd)) return;
    startTransition(() => action(fd));
  };
}
