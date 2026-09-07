"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import {
  createSource,
  deleteSource,
  listSources,
  type Source,
  updateSource,
} from "@/lib/api";
import styles from "./sources.module.css";

type FormMode = "create" | "edit";

type FormState = {
  organization: string;
  url: string;
  publication_date: string;
  last_checked: string;
};

const emptyForm: FormState = {
  organization: "",
  url: "",
  publication_date: "",
  last_checked: "",
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSources();
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaynaklar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadSources();
    });
  }, [loadSources]);

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function openEditForm(source: Source) {
    setFormMode("edit");
    setEditingId(source.id);
    setForm({
      organization: source.organization,
      url: source.url,
      publication_date: source.publication_date ?? "",
      last_checked: source.last_checked ?? "",
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

    const organization = form.organization.trim();
    const url = form.url.trim();
    if (!organization) {
      setFormError("Kurum zorunludur.");
      return;
    }
    if (!url) {
      setFormError("URL zorunludur.");
      return;
    }

    const payload = {
      organization,
      url,
      publication_date: form.publication_date ? form.publication_date : null,
      last_checked: form.last_checked ? form.last_checked : null,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createSource(payload);
        setSuccess("Kaynak başarıyla eklendi.");
      } else if (editingId !== null) {
        await updateSource(editingId, payload);
        setSuccess("Kaynak başarıyla güncellendi.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      await loadSources();
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
      await deleteSource(deleteTarget.id);
      setSuccess("Kaynak silindi.");
      setDeleteTarget(null);
      await loadSources();
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
          <h1 className={styles.title}>Kaynaklar</h1>
          <p className={styles.subtitle}>
            Mevzuat kaynaklarının kurum ve URL bilgilerini oluşturun, düzenleyin
            ve silin.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateForm}>
          Yeni Kaynak Ekle
        </button>
      </header>

      {success ? <div className={styles.successBanner}>{success}</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <p className={styles.stateText}>Yükleniyor...</p>
        ) : sources.length === 0 ? (
          <p className={styles.stateText}>Henüz kaynak bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Kurum</th>
                  <th>URL</th>
                  <th>Yayınlanma Tarihi</th>
                  <th>Son Kontrol</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td>{source.organization}</td>
                    <td>
                      <a
                        className={styles.urlLink}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        title={source.url}
                      >
                        {source.url}
                      </a>
                    </td>
                    <td>{source.publication_date || "—"}</td>
                    <td>{source.last_checked || "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => openEditForm(source)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setDeleteTarget(source)}
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
            aria-labelledby="source-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="source-form-title" className={styles.modalTitle}>
              {formMode === "create" ? "Yeni Kaynak" : "Kaynağı Düzenle"}
            </h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>
                Kurum
                <input
                  className={styles.input}
                  value={form.organization}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      organization: event.target.value,
                    }))
                  }
                  required
                  maxLength={255}
                  disabled={saving}
                />
              </label>
              <label className={styles.label}>
                URL
                <input
                  className={styles.input}
                  type="url"
                  value={form.url}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, url: event.target.value }))
                  }
                  required
                  disabled={saving}
                  placeholder="https://..."
                />
              </label>
              <label className={styles.label}>
                Yayınlanma Tarihi
                <input
                  className={styles.input}
                  type="date"
                  value={form.publication_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      publication_date: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </label>
              <label className={styles.label}>
                Son Kontrol Tarihi
                <input
                  className={styles.input}
                  type="date"
                  value={form.last_checked}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      last_checked: event.target.value,
                    }))
                  }
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
            aria-labelledby="delete-source-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-source-title" className={styles.modalTitle}>
              Kaynağı Sil
            </h2>
            <p className={styles.confirmText}>
              Bu kaynağı silmek istediğinizden emin misiniz?
            </p>
            <p className={styles.confirmName}>{deleteTarget.organization}</p>
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
