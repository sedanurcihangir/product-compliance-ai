"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import {
  createProductCategory,
  deleteProductCategory,
  listProductCategories,
  type ProductCategory,
  updateProductCategory,
} from "@/lib/api";
import styles from "./product-categories.module.css";

type FormMode = "create" | "edit";

type FormState = {
  name: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
};

export default function ProductCategoriesPage() {
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

  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProductCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategoriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadCategories();
    });
  }, [loadCategories]);

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function openEditForm(category: ProductCategory) {
    setFormMode("edit");
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
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

    const payload = {
      name,
      description: form.description.trim() ? form.description.trim() : null,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createProductCategory(payload);
        setSuccess("Kategori başarıyla eklendi.");
      } else if (editingId !== null) {
        await updateProductCategory(editingId, payload);
        setSuccess("Kategori başarıyla güncellendi.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      await loadCategories();
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
      await deleteProductCategory(deleteTarget.id);
      setSuccess("Kategori silindi.");
      setDeleteTarget(null);
      await loadCategories();
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
          <h1 className={styles.title}>Ürün Kategorileri</h1>
          <p className={styles.subtitle}>
            Kategoriler geniş ürün gruplarıdır (ör. Elektronik Ürünler). Asıl
            ürün kayıtları Ürünler sayfasında yönetilir.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateForm}>
          Yeni Kategori Ekle
        </button>
      </header>

      {success ? <div className={styles.successBanner}>{success}</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <p className={styles.stateText}>Yükleniyor...</p>
        ) : categories.length === 0 ? (
          <p className={styles.stateText}>Henüz kategori bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ad</th>
                  <th>Açıklama</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>{category.name}</td>
                    <td>{category.description || "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => openEditForm(category)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setDeleteTarget(category)}
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
            aria-labelledby="category-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="category-form-title" className={styles.modalTitle}>
              {formMode === "create" ? "Yeni Kategori" : "Kategoriyi Düzenle"}
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
              Kategoriyi Sil
            </h2>
            <p className={styles.confirmText}>
              Bu kategoriyi silmek istediğinizden emin misiniz?
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
