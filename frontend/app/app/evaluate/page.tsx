"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEvaluation,
  listProductCategories,
  type ProductCategory,
} from "@/lib/api";
import { storeEvaluationResult } from "@/lib/evaluationStorage";
import styles from "./evaluate.module.css";

type FormState = {
  productName: string;
  categoryId: string;
  description: string;
  originCountry: string;
  productUrl: string;
};

const emptyForm: FormState = {
  productName: "",
  categoryId: "",
  description: "",
  originCountry: "",
  productUrl: "",
};

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function EvaluatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await listProductCategories();
      setCategories(data);
    } catch (err) {
      setCategoriesError(
        err instanceof Error
          ? err.message
          : "Ürün kategorileri yüklenemedi.",
      );
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadCategories();
    });
  }, [loadCategories]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const productName = form.productName.trim();
    const description = form.description.trim();
    const originCountry = form.originCountry.trim();
    const productUrl = form.productUrl.trim();

    if (!productName) {
      setFormError("Ürün adı zorunludur.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Ürün kategorisi seçimi zorunludur.");
      return;
    }
    if (categories.length === 0) {
      setFormError(
        "Henüz ürün kategorisi tanımlı değil. Değerlendirme için önce Admin Panelden kategori eklenmelidir.",
      );
      return;
    }
    if (!description) {
      setFormError("Ürün açıklaması zorunludur.");
      return;
    }
    if (!originCountry) {
      setFormError("Menşe / tedarikçi ülkesi zorunludur.");
      return;
    }
    if (productUrl && !isValidHttpUrl(productUrl)) {
      setFormError("Ürün linki geçerli bir URL olmalıdır (ör. https://...).");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createEvaluation({
        product_name: productName,
        product_category_id: Number(form.categoryId),
        product_description: description,
        supplier_country: originCountry,
        product_url: productUrl ? productUrl : null,
      });

      storeEvaluationResult(response);
      router.push("/app/evaluate/result");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Değerlendirme isteği gönderilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ürün Değerlendirmesi</h1>
        <p className={styles.subtitle}>
          Değerlendirmeyi başlatmak için ürün bilgilerini girin. Sistem önce
          ilgili kayıtları retrieval ile bulur; LLM yapılandırılmışsa RAG
          destekli ön değerlendirme üretir. Resmi onay yerine geçmez.
        </p>
        <p className={styles.noteBanner}>
          Değerlendirme birkaç saniye sürebilir. Sonuç bir ön uygunluk karar
          desteğidir; resmi ithalat/uygunluk onayı değildir.
        </p>
      </header>

      {categoriesLoading ? (
        <p className={styles.info}>Kategoriler yükleniyor...</p>
      ) : null}

      {categoriesError ? (
        <div className={styles.errorBanner}>
          Kategori listesi yüklenemedi: {categoriesError}
        </div>
      ) : null}

      {!categoriesLoading && !categoriesError && categories.length === 0 ? (
        <div className={styles.warningBanner}>
          Henüz ürün kategorisi bulunmuyor. Değerlendirme formu için Admin
          Panel üzerinden en az bir Product Category eklemeniz gerekir.
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.label}>
          Ürün Adı
          <input
            className={styles.input}
            value={form.productName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, productName: event.target.value }))
            }
            required
            maxLength={255}
            disabled={submitting}
          />
        </label>

        <label className={styles.label}>
          Ürün Kategorisi
          <select
            className={styles.select}
            value={form.categoryId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, categoryId: event.target.value }))
            }
            required
            disabled={
              submitting || categoriesLoading || categories.length === 0
            }
          >
            <option value="" disabled>
              Kategori seçin
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Ürün Açıklaması
          <textarea
            className={styles.textarea}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            rows={4}
            required
            disabled={submitting}
          />
        </label>

        <label className={styles.label}>
          Ürünün Menşe / Tedarikçi Ülkesi
          <input
            className={styles.input}
            value={form.originCountry}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                originCountry: event.target.value,
              }))
            }
            required
            maxLength={255}
            disabled={submitting}
            placeholder="Örn. Çin, Almanya"
          />
        </label>

        <label className={styles.label}>
          Ürün Linki <span className={styles.optional}>(opsiyonel)</span>
          <input
            className={styles.input}
            type="url"
            value={form.productUrl}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, productUrl: event.target.value }))
            }
            disabled={submitting}
            placeholder="https://..."
          />
        </label>

        {formError ? <p className={styles.formError}>{formError}</p> : null}

        <button
          type="submit"
          className={styles.submit}
          disabled={
            submitting ||
            categoriesLoading ||
            Boolean(categoriesError) ||
            categories.length === 0
          }
        >
          {submitting
            ? "Ürününüz için ön uygunluk değerlendirmesi hazırlanıyor..."
            : "Değerlendirmeyi Başlat"}
        </button>
      </form>
    </section>
  );
}
