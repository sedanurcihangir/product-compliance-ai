import type { Metadata } from "next";
import Link from "next/link";
import styles from "./user.module.css";

export const metadata: Metadata = {
  title: "Kullanıcı Paneli | Product Compliance AI",
  description: "Ürün ithalatı ön uygunluk değerlendirmesi",
};

export default function UserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <Link href="/app" className={styles.brand}>
            Product Compliance AI
          </Link>
          <span className={styles.badge}>Kullanıcı Paneli</span>
        </div>
        <nav className={styles.nav} aria-label="Kullanıcı paneli">
          <Link href="/app" className={styles.navLink}>
            Ana Sayfa
          </Link>
          <Link href="/app/evaluate" className={styles.navLink}>
            Değerlendirme
          </Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>
          Bu sistem ön değerlendirme ve karar destek amacıyla hazırlanmıştır.
          Resmi uygunluk veya hukuki onay yerine geçmez.
        </p>
      </footer>
    </div>
  );
}
