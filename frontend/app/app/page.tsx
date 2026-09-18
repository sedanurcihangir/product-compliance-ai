import Link from "next/link";
import styles from "./home.module.css";

export default function UserHomePage() {
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Türkiye ithalatı için ön kontrol</p>
      <h1 className={styles.title}>Ürün İthalatı Ön Uygunluk</h1>
      <p className={styles.subtitle}>
        Ürünü sipariş etmeden önce, Türkiye&apos;de karşılaşabileceğiniz
        mevzuat, belge ve uygunluk gerekliliklerini önceden kontrol edin.
      </p>

      <Link href="/app/evaluate" className={styles.cta}>
        Ürün Değerlendirmesine Başla
      </Link>

      <aside className={styles.disclaimer} role="note">
        Bu sistem ön değerlendirme ve karar destek amacıyla hazırlanmıştır.
        Resmi uygunluk veya hukuki onay yerine geçmez.
      </aside>
    </section>
  );
}
