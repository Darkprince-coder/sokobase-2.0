"use client";
import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import styles from "./ProductGallery.module.css";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className={styles.main}><Package size={56} strokeWidth={1.3} className={styles.placeholder} aria-hidden="true" /></div>;
  }
  return (
    <div>
      <div className={styles.main}>
        <Image src={images[active]} alt={name} fill sizes="(max-width: 768px) 100vw, 480px" className={styles.img} priority />
      </div>
      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.map((src, i) => (
            <button key={src + i} type="button" className={i === active ? styles.thumbOn : styles.thumb} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} aria-current={i === active}>
              <Image src={src} alt="" fill sizes="64px" className={styles.img} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
