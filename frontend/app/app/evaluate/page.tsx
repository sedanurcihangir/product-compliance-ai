"use client";

import { FormEvent, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEvaluation,
  getCurrentUser,
  listProductCategories,
  listProducts,
  type Product,
  type ProductCategory,
} from "@/lib/api";
import { storeEvaluationResult } from "@/lib/evaluationStorage";
import styles from "./evaluate.module.css";

type FormState = {
  productName: string;
  categoryId: string;
  productId: string;
  description: string;
  originCountry: string;
  productUrl: string;
};

const emptyForm: FormState = {
  productName: "",
  categoryId: "",
  productId: "",
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await listProductCategories({ has_products: true });
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

  const loadProducts = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setProducts([]);
      return;
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await listProducts({
        product_category_id: Number(categoryId),
      });
      setProducts(data);
    } catch (err) {
      setProducts([]);
      setProductsError(
        err instanceof Error ? err.message : "Ürünler yüklenemedi.",
      );
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getCurrentUser();
        if (!cancelled) {
          setAuthChecking(false);
          startTransition(() => {
            void loadCategories();
          });
        }
      } catch {
        if (!cancelled) {
          router.replace("/app/login");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCategories, router]);

  useEffect(() => {
    startTransition(() => {
      void loadProducts(form.categoryId);
    });
  }, [form.categoryId, loadProducts]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === form.productId) ?? null,
    [products, form.productId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const productName = form.productName.trim();
    const description = form.description.trim();
    const originCountry = form.originCountry.trim();
    const productUrl = form.productUrl.trim();

    if (!form.categoryId) {
      setFormError("Ürün kategorisi seçimi zorunludur.");
      return;
    }
    if (!form.productId) {
      setFormError("Ürün seçimi zorunludur.");
      return;
    }
    if (!productName) {
      setFormError("Ürün adı zorunludur.");
      return;
    }
    if (categories.length === 0) {
      setFormError(
        "Henüz ürün kategorisi tanımlı değil. Değerlendirme için önce Admin Panelden kategori eklenmelidir.",
      );
      return;
    }
    if (products.length === 0) {
      setFormError(
        "Seçilen kategori altında ürün bulunmuyor. Admin Panelden ürün ekleyin.",
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
        product_id: Number(form.productId),
        product_category_id: Number(form.categoryId),
        product_description: description,
        supplier_country: originCountry,
        product_url: productUrl ? productUrl : null,
      });

      storeEvaluationResult(response);
      if (response.evaluation_id) {
        router.push(`/app/evaluations/${response.evaluation_id}`);
      } else {
        router.push("/app/evaluate/result");
      }
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

  if (authChecking) {
    return (
      <section className={styles.page}>
        <p className={styles.info}>Oturum kontrol ediliyor…</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Yeni Ürün Değerlendirmesi</h1>
        <p className={styles.subtitle}>
          Ürünü sipariş etmeden önce karşılaşabileceğiniz mevzuat ve uygunluk
          gerekliliklerini kontrol edin.
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

      {productsError ? (
        <div className={styles.errorBanner}>
          Ürün listesi yüklenemedi: {productsError}
        </div>
      ) : null}

      {!categoriesLoading && !categoriesError && categories.length === 0 ? (
        <div className={styles.warningBanner}>
          Henüz ürün kategorisi bulunmuyor. Değerlendirme formu için Admin
          Panel üzerinden en az bir Product Category ve Product eklemeniz
          gerekir.
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.label}>
          Ürün Kategorisi
          <select
            className={styles.select}
            value={form.categoryId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                categoryId: event.target.value,
                productId: "",
              }))
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
          Ürün
          <select
            className={styles.select}
            value={form.productId}
            onChange={(event) => {
              const nextId = event.target.value;
              const match = products.find((p) => String(p.id) === nextId);
              setForm((prev) => ({
                ...prev,
                productId: nextId,
                productName:
                  match && !prev.productName.trim()
                    ? match.name
                    : match
                      ? match.name
                      : prev.productName,
              }));
            }}
            required
            disabled={
              submitting ||
              !form.categoryId ||
              productsLoading ||
              products.length === 0
            }
          >
            <option value="" disabled>
              {productsLoading ? "Ürünler yükleniyor…" : "Ürün seçin"}
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

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
            placeholder={selectedProduct?.name || "Örn. Bluetooth Kulaklık"}
          />
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
            categories.length === 0 ||
            !form.productId
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
