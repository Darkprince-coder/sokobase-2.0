"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Package, X } from "lucide-react";
import styles from "./ProductGallery.module.css";

// Swipeable on phones (scroll-snap, dots), thumbnails on larger screens, full-screen viewer on tap.
// `index` lets the page jump to a photo (e.g. when a colour is chosen).
export default function ProductGallery({ images, name, index = 0 }: { images: string[]; name: string; index?: number }) {
  const [active, setActive] = useState(index);
  const track = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);

  const go = (i: number, smooth = true) => {
    const n = Math.max(0, Math.min(images.length - 1, i));
    setActive(n);
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  // Follow the page's requested photo (colour change).
  const [lastIndex, setLastIndex] = useState(index);
  if (index !== lastIndex) { setLastIndex(index); setActive(index); }
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  if (images.length === 0) {
    return <div className={styles.empty}><Package size={56} strokeWidth={1.3} aria-hidden="true" /></div>;
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <div ref={track} className={styles.track} onScroll={onScroll}>
          {images.map((src, i) => (
            <button key={src + i} type="button" className={styles.slide} onClick={() => viewer.current?.showModal()} aria-label={`View photo ${i + 1} full screen`}>
              <Image src={`${src}#pad`} alt={i === 0 ? name : `${name}, photo ${i + 1}`} fill sizes="(max-width: 860px) 100vw, 560px" className={styles.img} preload={i === 0} />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous photo"><ChevronLeft size={20} /></button>
            <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(active + 1)} disabled={active === images.length - 1} aria-label="Next photo"><ChevronRight size={20} /></button>
            <div className={styles.dots} aria-hidden="true">{images.map((_, i) => <span key={i} className={i === active ? styles.dotOn : styles.dot} />)}</div>
            <span className={styles.counter}>{active + 1}/{images.length}</span>
          </>
        )}
        <span className={styles.zoomHint} aria-hidden="true"><Expand size={14} /></span>
      </div>

      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.map((src, i) => (
            <button key={src + i} type="button" className={i === active ? styles.thumbOn : styles.thumb} onClick={() => go(i)} aria-label={`Photo ${i + 1}`} aria-current={i === active}>
              <Image src={`${src}#fill`} alt="" fill sizes="72px" className={styles.thumbImg} />
            </button>
          ))}
        </div>
      )}

      <dialog ref={viewer} className={styles.viewer} aria-label="Photo viewer" onClick={(e) => { if (e.target === viewer.current) viewer.current?.close(); }}>
        <button type="button" className={styles.close} onClick={() => viewer.current?.close()} aria-label="Close"><X size={22} /></button>
        <div className={styles.viewerImg}>
          <Image src={`${images[active]}#cover`} alt={name} fill sizes="100vw" className={styles.img} />
        </div>
        {images.length > 1 && (
          <>
            <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(active - 1, false)} disabled={active === 0} aria-label="Previous photo"><ChevronLeft size={22} /></button>
            <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(active + 1, false)} disabled={active === images.length - 1} aria-label="Next photo"><ChevronRight size={22} /></button>
          </>
        )}
      </dialog>
    </div>
  );
}
