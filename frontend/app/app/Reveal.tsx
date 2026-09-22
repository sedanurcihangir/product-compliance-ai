"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./home.module.css";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  /** When true, animates on first paint (hero load), not on scroll. */
  immediate?: boolean;
};

const FALLBACK_MS = 1800;

export default function Reveal({
  children,
  className,
  delayMs = 0,
  immediate = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const show = () => {
      if (!cancelled) setVisible(true);
    };
    const enhance = () => {
      if (!cancelled) setEnhanced(true);
    };

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || immediate || typeof IntersectionObserver === "undefined") {
      const id = window.requestAnimationFrame(show);
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(id);
      };
    }

    // Progressive enhancement: hide only after JS opts in (async).
    // Without JS / if this effect never runs, CSS keeps content visible.
    const enhanceId = window.requestAnimationFrame(enhance);

    const node = ref.current;
    if (!node) {
      const id = window.requestAnimationFrame(show);
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(enhanceId);
        window.cancelAnimationFrame(id);
      };
    }

    const fallbackId = window.setTimeout(show, FALLBACK_MS);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            observer.disconnect();
            window.clearTimeout(fallbackId);
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(fallbackId);
      window.cancelAnimationFrame(enhanceId);
    };
  }, [immediate]);

  const style = {
    "--reveal-delay": `${delayMs}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={[
        styles.reveal,
        enhanced ? styles.revealEnhanced : "",
        visible ? styles.revealVisible : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-reveal={visible || !enhanced ? "visible" : "hidden"}
    >
      {children}
    </div>
  );
}
