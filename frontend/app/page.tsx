import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1>Product Compliance AI</h1>
        <p>Admin panelinden ürün kategorilerini yönetebilirsiniz.</p>
        <Link className={styles.cta} href="/admin/product-categories">
          Admin Panel&apos;e Git
        </Link>
      </div>
    </main>
  );
}
