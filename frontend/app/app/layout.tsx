import type { Metadata } from "next";
import Link from "next/link";
import UserNav from "./UserNav";
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
        <UserNav />
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>Product Compliance AI · ön değerlendirme karar desteği</p>
      </footer>
    </div>
  );
}
