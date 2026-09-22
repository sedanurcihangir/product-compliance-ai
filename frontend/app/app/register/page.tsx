"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { registerUser } from "@/lib/api";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
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
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({ email: cleanedEmail, password });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hesap Oluştur</h1>
        <p className={styles.subtitle}>
          Değerlendirmelerinizi kaydetmek ve geçmişinize erişmek için ücretsiz
          hesap oluşturun.
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className={styles.label}>
          Şifre (tekrar)
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            required
            minLength={8}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? "Kaydediliyor…" : "Kayıt Ol"}
        </button>
      </form>

      <p className={styles.switch}>
        Zaten hesabınız var mı?{" "}
        <Link href="/app/login" className={styles.link}>
          Giriş yapın
        </Link>
      </p>
    </section>
  );
}
