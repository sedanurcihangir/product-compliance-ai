"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginUser } from "@/lib/api";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const cleanedEmail = email.trim();
    if (!cleanedEmail) {
      setError("E-posta zorunludur.");
      return;
    }
    if (!password) {
      setError("Şifre zorunludur.");
      return;
    }

    setSubmitting(true);
    try {
      await loginUser({ email: cleanedEmail, password });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Giriş Yap</h1>
        <p className={styles.subtitle}>
          Değerlendirme yapmak ve geçmişinizi görmek için hesabınıza giriş
          yapın.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.label}>
          E-posta
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          Şifre
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>

      <p className={styles.switch}>
        Hesabınız yok mu?{" "}
        <Link href="/app/register" className={styles.link}>
          Kayıt olun
        </Link>
      </p>
    </section>
  );
}
