"use client";

import { useEffect, useState } from "react";
import {
  listDistributions,
  type ProductDistributionRecord,
} from "@/lib/api";
import styles from "../product-categories/product-categories.module.css";

export default function DistributionsAdminPage() {
  const [rows, setRows] = useState<ProductDistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listDistributions();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Dağıtım kayıtları yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dağıtımlar</h1>
        <p className={styles.subtitle}>
          Mevcut ürün dağıtım kayıtlarının listesi. Ana sayfa analitiği{" "}
          <a href="/admin">/admin</a> üzerinden görüntülenir.
        </p>
        <p className={styles.subtitle}>
          Demo veri seti — gerçek ticari veya ithalat verisi değildir.
        </p>
      </header>

      {loading ? <p>Yükleniyor…</p> : null}
      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      {!loading && !error ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Ürün</th>
                <th>Şehir</th>
                <th>Kod</th>
                <th>Miktar</th>
                <th>Tarih</th>
                <th>Demo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.product_name}</td>
                  <td>{row.city}</td>
                  <td>{row.city_code}</td>
                  <td>{row.quantity}</td>
                  <td>{row.distribution_date}</td>
                  <td>{row.is_demo ? "Evet" : "Hayır"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
