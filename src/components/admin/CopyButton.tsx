"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Button from "@/components/Button";

export default function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button" size="sm" variant="soft"
      icon={copied ? <Check size={15} /> : <Copy size={15} />}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
