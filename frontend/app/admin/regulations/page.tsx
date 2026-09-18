"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import {
  createRegulation,
  deleteRegulation,
  listCountries,
  listProductCategories,
  listRegulations,
  type Country,
  type ProductCategory,
  type Regulation,
  type RegulationStatus,
  updateRegulation,
} from "@/lib/api";
import styles from "./regulations.module.css";

type FormMode = "create" | "edit";

type FormState = {
  title: string;
  description: string;
  country_id: string;
  product_category_id: string;
  effective_date: string;
  status: RegulationStatus;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  country_id: "",
  product_category_id: "",
  effective_date: "",
  status: "active",
};

function statusLabel(status: RegulationStatus): string {
  return status === "active" ? "Aktif" : "Pasif";
}

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
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
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Regulation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRegulations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRegulations();
      setRegulations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mevzuatlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCountries = useCallback(async () => {
    setCountriesError(null);
    try {
      const data = await listCountries();
      setCountries(data);
    } catch (err) {
      setCountriesError(
        err instanceof Error ? err.message : "Ülke listesi yüklenemedi.",
      );
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesError(null);
    try {
      const data = await listProductCategories();
      setCategories(data);
    } catch (err) {
      setCategoriesError(
        err instanceof Error ? err.message : "Ürün kategorileri yüklenemedi.",
      );
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadRegulations();
      void loadCountries();
      void loadCategories();
    });
  }, [loadRegulations, loadCountries, loadCategories]);

  function categoryName(categoryId: number | null): string {
    if (categoryId == null) return "—";
    const match = categories.find((category) => category.id === categoryId);
    return match ? match.name : `ID ${categoryId}`;
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm({
      ...emptyForm,
      country_id: countries[0] ? String(countries[0].id) : "",
      product_category_id: "",
    });
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function openEditForm(regulation: Regulation) {
    setFormMode("edit");
    setEditingId(regulation.id);
    setForm({
      title: regulation.title,
      description: regulation.description ?? "",
      country_id: String(regulation.country_id),
      product_category_id:
        regulation.product_category_id != null
          ? String(regulation.product_category_id)
          : "",
      effective_date: regulation.effective_date ?? "",
      status: regulation.status,
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

    const title = form.title.trim();
    if (!title) {
      setFormError("Başlık zorunludur.");
      return;
    }
    if (!form.country_id) {
      setFormError("Ülke seçimi zorunludur.");
      return;
    }
    if (countries.length === 0) {
      setFormError(
        "Henüz ülke kaydı yok. Mevzuat eklemek için önce Country verisi tanımlanmalıdır.",
      );
      return;
    }

    const payload = {
      title,
      description: form.description.trim() ? form.description.trim() : null,
      country_id: Number(form.country_id),
      product_category_id: form.product_category_id
        ? Number(form.product_category_id)
        : null,
      effective_date: form.effective_date ? form.effective_date : null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createRegulation(payload);
        setSuccess("Mevzuat başarıyla eklendi.");
      } else if (editingId !== null) {
        await updateRegulation(editingId, payload);
        setSuccess("Mevzuat başarıyla güncellendi.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      await loadRegulations();
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
      await deleteRegulation(deleteTarget.id);
      setSuccess("Mevzuat silindi.");
      setDeleteTarget(null);
      await loadRegulations();
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
          <h1 className={styles.title}>Mevzuatlar</h1>
          <p className={styles.subtitle}>
            Ürün uygunluğu için kullanılan mevzuat kayıtlarını oluşturun,
            düzenleyin ve silin.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreateForm}
          disabled={countries.length === 0}
          title={
            countries.length === 0
              ? "Önce Country verisi tanımlanmalıdır"
              : undefined
          }
        >
          Yeni Mevzuat Ekle
        </button>
      </header>

      {countries.length === 0 && !countriesError ? (
        <div className={styles.errorBanner}>
          Country tablosu boş. Mevzuat eklemek için önce ülke kaydı
          tanımlanmalıdır. Bu aşamada rastgele ülke eklenmez.
        </div>
      ) : null}
      {countriesError ? (
        <div className={styles.errorBanner}>Ülke listesi: {countriesError}</div>
      ) : null}
      {categoriesError ? (
        <div className={styles.errorBanner}>
          Ürün kategorileri: {categoriesError}
        </div>
      ) : null}
      {success ? <div className={styles.successBanner}>{success}</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <p className={styles.stateText}>Yükleniyor...</p>
        ) : regulations.length === 0 ? (
          <p className={styles.stateText}>Henüz mevzuat bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Başlık</th>
                  <th>Ülke</th>
                  <th>Ürün Kategorisi</th>
                  <th>Yürürlük Tarihi</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {regulations.map((regulation) => (
                  <tr key={regulation.id}>
                    <td>{regulation.id}</td>
                    <td>{regulation.title}</td>
                    <td>
                      {regulation.country.name} ({regulation.country.code})
                    </td>
                    <td>{categoryName(regulation.product_category_id)}</td>
                    <td>{regulation.effective_date || "—"}</td>
                    <td>{statusLabel(regulation.status)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => openEditForm(regulation)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setDeleteTarget(regulation)}
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
            aria-labelledby="regulation-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="regulation-form-title" className={styles.modalTitle}>
              {formMode === "create" ? "Yeni Mevzuat" : "Mevzuatı Düzenle"}
            </h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>
                Başlık
                <input
                  className={styles.input}
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
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
              <label className={styles.label}>
                Ülke
                <select
                  className={styles.select}
                  value={form.country_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      country_id: event.target.value,
                    }))
                  }
                  required
                  disabled={saving || countries.length === 0}
                >
                  <option value="" disabled>
                    Ülke seçin
                  </option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Ürün Kategorisi
                <select
                  className={styles.select}
                  value={form.product_category_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      product_category_id: event.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="">Kategori seçilmedi (opsiyonel)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Yürürlük Tarihi
                <input
                  className={styles.input}
                  type="date"
                  value={form.effective_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      effective_date: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </label>
              <label className={styles.label}>
                Durum
                <select
                  className={styles.select}
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as RegulationStatus,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
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
            aria-labelledby="delete-regulation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-regulation-title" className={styles.modalTitle}>
              Mevzuatı Sil
            </h2>
            <p className={styles.confirmText}>
              Bu mevzuatı silmek istediğinizden emin misiniz?
            </p>
            <p className={styles.confirmName}>{deleteTarget.title}</p>
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
