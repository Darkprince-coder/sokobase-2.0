import { Search } from "lucide-react";
import styles from "./SearchBar.module.css";

export default function SearchBar() {
  return (
    <form role="search" action="/products" method="get" className={styles.form}>
      <Search size={18} aria-hidden="true" className={styles.icon} />
      <input type="search" name="q" placeholder="Search products, brands and shops" aria-label="Search SokoBase" autoComplete="off" />
      <button type="submit">Search</button>
    </form>
  );
}
