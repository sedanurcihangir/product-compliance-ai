"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import {
  createProduct,
  deleteProduct,
  listProductCategories,
  listProducts,
  updateProduct,
  type Product,
  type ProductCategory,
} from "@/lib/api";
import styles from "./products.module.css";

type FormMode = "create" | "edit";

type FormState = {
  name: string;
  description: string;
  product_category_id: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  product_category_id: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRows, categoryRows] = await Promise.all([
        listProducts(),
        listProductCategories(),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ürünler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadData();
    });
  }, [loadData]);

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setFormMode("edit");
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      product_category_id: String(product.product_category_id),
    });
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Ad zorunludur.");
      return;
    }
    if (!form.product_category_id) {
      setFormError("Ürün kategorisi zorunludur.");
      return;
    }

    const payload = {
      name,
      description: form.description.trim() ? form.description.trim() : null,
      product_category_id: Number(form.product_category_id),
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createProduct(payload);
        setSuccess("Ürün başarıyla eklendi.");
      } else if (editingId !== null) {
        await updateProduct(editingId, payload);
        setSuccess("Ürün başarıyla güncellendi.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "İşlem başarısız oldu.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteProduct(deleteTarget.id);
      setSuccess("Ürün silindi.");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme işlemi başarısız oldu.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ürünler</h1>
          <p className={styles.subtitle}>
            Değerlendirme formunda seçilen ürün kayıtları. Her ürün bir
            kategoriye (ör. Elektronik Ürünler) bağlıdır.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateForm}>
          Yeni Ürün Ekle
        </button>
      </header>

      {success ? <div className={styles.successBanner}>{success}</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <p className={styles.stateText}>Yükleniyor...</p>
        ) : products.length === 0 ? (
          <p className={styles.stateText}>Henüz ürün bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ad</th>
                  <th>Kategori</th>
                  <th>Açıklama</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.product_category_name || product.product_category_id}</td>
                    <td>{product.description || "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => openEditForm(product)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setDeleteTarget(product)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen ? (
        <div className={styles.overlay} role="presentation" onClick={closeForm}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="product-form-title" className={styles.modalTitle}>
              {formMode === "create" ? "Yeni Ürün" : "Ürünü Düzenle"}
            </h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>
                Ad
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                  maxLength={255}
                  disabled={saving}
                />
              </label>
              <label className={styles.label}>
                Kategori
                <select
                  className={styles.input}
                  value={form.product_category_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      product_category_id: event.target.value,
                    }))
                  }
                  required
                  disabled={saving}
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
                Açıklama
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  disabled={saving}
                />
              </label>
              {formError ? <p className={styles.formError}>{formError}</p> : null}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeForm}
                  disabled={saving}
                >
                  İptal
                </button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => (!deleting ? setDeleteTarget(null) : null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-title" className={styles.modalTitle}>
              Ürünü Sil
            </h2>
            <p className={styles.confirmText}>
              Bu ürünü silmek istediğinizden emin misiniz? Bağlı evaluation
              kayıtları varsa silme engellenir.
            </p>
            <p className={styles.confirmName}>{deleteTarget.name}</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
