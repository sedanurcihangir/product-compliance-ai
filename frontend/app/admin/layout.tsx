import type { Metadata } from "next";
import Link from "next/link";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Admin | Product Compliance AI",
  description: "Admin panel for product compliance data",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>Product Compliance AI</span>
          <span className={styles.brandSubtitle}>Admin</span>
        </div>
        <nav className={styles.nav} aria-label="Admin">
          <Link href="/admin/product-categories" className={styles.navLink}>
            Product Categories
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
        </nav>

      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
