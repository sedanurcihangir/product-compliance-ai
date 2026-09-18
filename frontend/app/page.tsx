import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1>Product Compliance AI</h1>
        <p>
          Ürün ithalatı ön uygunluk değerlendirmesi için kullanıcı paneline
          gidin veya veri yönetimi için admin paneli kullanın.
        </p>
        <Link className={styles.cta} href="/app">
          Kullanıcı Paneli&apos;ne Git
        </Link>
        <Link className={styles.secondary} href="/admin/product-categories">
          Admin Panel&apos;e Git
        </Link>
      </div>
    </main>
  );
}
