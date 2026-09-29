"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import styles from "./HeroCarousel.module.css";

const INTERVAL = 5500;
const SWIPE = 60;
const variants = {
  enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
};

// One slide: static. Two or more: auto-rotates, swipeable, arrows and dots.
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const dragged = useRef(false);
  const many = slides.length > 1;

  const go = useCallback((step: number) => {
    setState(([i]) => [(i + step + slides.length) % slides.length, step]);
  }, [slides.length]);

  useEffect(() => {
    if (!many || paused) return;
    const t = setInterval(() => go(1), INTERVAL);
    return () => clearInterval(t);
  }, [many, paused, go]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE) go(1);
    else if (info.offset.x >= SWIPE) go(-1);
    setTimeout(() => { dragged.current = false; }, 0);
  };

  const slide = slides[index];
  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={slide.id}
          className={`${styles.slide} ${slide.imageUrl ? styles.hasImage : styles.gradient}`}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          drag={many ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          dragMomentum={false}
          onDragStart={() => { dragged.current = true; setPaused(true); }}
          onDragEnd={onDragEnd}
          onClickCapture={(e) => { if (dragged.current) e.preventDefault(); }}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${slides.length}`}
        >
          {slide.imageUrl && <Image src={slide.imageUrl} alt="" fill priority={index === 0} sizes="(max-width: 1024px) 100vw, 60vw" className={styles.img} draggable={false} />}
          <div className={styles.copy}>
            <h1 className={styles.title}>{slide.title}</h1>
            {slide.subtitle && <p className={styles.sub}>{slide.subtitle}</p>}
            {slide.ctaLabel && slide.href && <Link href={slide.href} className={styles.cta}>{slide.ctaLabel}</Link>}
          </div>
        </motion.div>
      </AnimatePresence>

      {many && (
        <>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(-1)} aria-label="Previous slide"><ChevronLeft size={22} /></button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(1)} aria-label="Next slide"><ChevronRight size={22} /></button>
          <div className={styles.dots}>
            {slides.map((s, i) => (
              <button key={s.id} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === index} className={i === index ? styles.dotOn : styles.dot} onClick={() => setState([i, i > index ? 1 : -1])} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
