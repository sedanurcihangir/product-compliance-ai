"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api";
import styles from "./admin.module.css";

type GuardState = "loading" | "ok" | "unauthenticated" | "forbidden";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (cancelled) return;
        if ((user.role || "").toLowerCase() === "admin") {
          setState("ok");
        } else {
          setState("forbidden");
        }
      } catch {
        if (!cancelled) setState("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state === "unauthenticated") {
      router.replace("/app/login");
    }
  }, [state, router]);

  if (state === "loading" || state === "unauthenticated") {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <p>Yetki kontrol ediliyor…</p>
        </main>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <h1>Yetkisiz erişim</h1>
          <p>Bu sayfaya erişim yetkiniz yok.</p>
          <p>
            <Link href="/app">Kullanıcı paneline dön</Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>Product Compliance AI</span>
          <span className={styles.brandSubtitle}>Admin</span>
        </div>
        <nav className={styles.nav} aria-label="Admin">
          <Link href="/admin" className={styles.navLink}>
            Ana Sayfa
          </Link>
          <Link href="/admin/product-categories" className={styles.navLink}>
            Product Categories
          </Link>
          <Link href="/admin/products" className={styles.navLink}>
            Products
          </Link>
          <Link href="/admin/regulations" className={styles.navLink}>
            Mevzuatlar
          </Link>
          <Link href="/admin/requirements" className={styles.navLink}>
            Gereklilikler
          </Link>
          <Link href="/admin/risk-rules" className={styles.navLink}>
            Risk Kuralları
          </Link>
          <Link href="/admin/sources" className={styles.navLink}>
            Kaynaklar
          </Link>
          <Link href="/admin/distributions" className={styles.navLink}>
            Distributions
          </Link>
        </nav>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
