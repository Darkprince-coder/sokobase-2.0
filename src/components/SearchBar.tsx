"use client";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./SearchBar.module.css";

function SearchForm({ q = "" }: { q?: string }) {
  return (
    <form role="search" action="/products" method="get" className={styles.form}>
      <Search size={18} aria-hidden="true" className={styles.icon} />
      {/* key: resets the field when the search in the URL changes (e.g. back button) */}
      <input key={q} type="search" name="q" defaultValue={q} placeholder="Search products and shops" aria-label="Search SokoBase" autoComplete="off" enterKeyHint="search" maxLength={80} />
      <button type="submit">Search</button>
    </form>
  );
}

// Keeps the current search term in the box on the results page.
function SearchFromUrl() {
  const pathname = usePathname();
  const q = useSearchParams().get("q") ?? "";
  return <SearchForm q={pathname === "/products" ? q : ""} />;
}

export default function SearchBar() {
  // useSearchParams needs a Suspense boundary so static pages can still be prerendered.
  return <Suspense fallback={<SearchForm />}><SearchFromUrl /></Suspense>;
}
