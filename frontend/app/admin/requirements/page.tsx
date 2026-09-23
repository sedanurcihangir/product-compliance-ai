"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import {
  createRequirement,
  deleteRequirement,
  listRegulations,
  listRequirements,
  type Regulation,
  type Requirement,
  updateRequirement,
} from "@/lib/api";
import { formatRequirementTypeLabel } from "@/lib/adminDisplay";
import styles from "./requirements.module.css";

type FormMode = "create" | "edit";

type FormState = {
  regulation_id: string;
  title: string;
  description: string;
  type: string;
};

const emptyForm: FormState = {
  regulation_id: "",
  title: "",
  description: "",
  type: "",
};

function regulationLabel(regulation: Regulation): string {
  return `${regulation.title} — ${regulation.country.name} (${regulation.country.code})`;
}

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regulationsError, setRegulationsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Requirement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRequirements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRequirements();
      setRequirements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gereklilikler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRegulations = useCallback(async () => {
    setRegulationsError(null);
    try {
      const data = await listRegulations();
      setRegulations(data);
    } catch (err) {
      setRegulationsError(
        err instanceof Error ? err.message : "Mevzuat listesi yüklenemedi.",
      );
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadRequirements();
      void loadRegulations();
    });
  }, [loadRequirements, loadRegulations]);

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm({
      ...emptyForm,
      regulation_id: regulations[0] ? String(regulations[0].id) : "",
    });
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function openEditForm(requirement: Requirement) {
    setFormMode("edit");
    setEditingId(requirement.id);
    setForm({
      regulation_id: String(requirement.regulation_id),
      title: requirement.title,
      description: requirement.description ?? "",
      type: requirement.type ?? "",
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
    if (!form.regulation_id) {
      setFormError("Mevzuat seçimi zorunludur.");
      return;
    }
    if (regulations.length === 0) {
      setFormError(
        "Henüz mevzuat kaydı yok. Gereklilik eklemek için önce Mevzuat tanımlanmalıdır.",
      );
      return;
    }

    const payload = {
      regulation_id: Number(form.regulation_id),
      title,
      description: form.description.trim() ? form.description.trim() : null,
      type: form.type.trim() ? form.type.trim() : null,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createRequirement(payload);
        setSuccess("Gereklilik başarıyla eklendi.");
      } else if (editingId !== null) {
        await updateRequirement(editingId, payload);
        setSuccess("Gereklilik başarıyla güncellendi.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      await loadRequirements();
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
      await deleteRequirement(deleteTarget.id);
      setSuccess("Gereklilik silindi.");
      setDeleteTarget(null);
      await loadRequirements();
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
          <h1 className={styles.title}>Gereklilikler</h1>
          <p className={styles.subtitle}>
            Mevzuatlara bağlı gereklilik kayıtlarını oluşturun, düzenleyin ve
            silin.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreateForm}
          disabled={regulations.length === 0}
          title={
            regulations.length === 0
              ? "Önce mevzuat kaydı tanımlanmalıdır"
              : undefined
          }
        >
          Yeni Gereklilik Ekle
        </button>
      </header>

      {regulations.length === 0 && !regulationsError ? (
        <div className={styles.errorBanner}>
          Mevzuat listesi boş. Gereklilik eklemek için önce Mevzuatlar
          sayfasından bir mevzuat kaydı oluşturun.
        </div>
      ) : null}
      {regulationsError ? (
        <div className={styles.errorBanner}>Mevzuat listesi: {regulationsError}</div>
      ) : null}
      {success ? <div className={styles.successBanner}>{success}</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <p className={styles.stateText}>Yükleniyor...</p>
        ) : requirements.length === 0 ? (
          <p className={styles.stateText}>Henüz gereklilik bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Bağlı Mevzuat</th>
                  <th>Tür</th>
                  <th>Açıklama</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((requirement) => (
                  <tr key={requirement.id}>
                    <td>{requirement.title}</td>
                    <td>
                      {requirement.regulation.title}
                      <span className={styles.muted}>
                        {" "}
                        ({requirement.regulation.country.code})
                      </span>
                    </td>
                    <td>{formatRequirementTypeLabel(requirement.type)}</td>
                    <td>{requirement.description || "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => openEditForm(requirement)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setDeleteTarget(requirement)}
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
            aria-labelledby="requirement-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="requirement-form-title" className={styles.modalTitle}>
              {formMode === "create" ? "Yeni Gereklilik" : "Gerekliliği Düzenle"}
            </h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>
                Mevzuat
                <select
                  className={styles.select}
                  value={form.regulation_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      regulation_id: event.target.value,
                    }))
                  }
                  required
                  disabled={saving || regulations.length === 0}
                >
                  <option value="" disabled>
                    Mevzuat seçin
                  </option>
                  {regulations.map((regulation) => (
                    <option key={regulation.id} value={regulation.id}>
                      {regulationLabel(regulation)}
                    </option>
                  ))}
                </select>
              </label>
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
                Tür
                <input
                  className={styles.input}
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                  maxLength={255}
                  disabled={saving}
                  placeholder="Serbest metin (isteğe bağlı)"
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
            aria-labelledby="delete-requirement-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-requirement-title" className={styles.modalTitle}>
              Gerekliliği Sil
            </h2>
            <p className={styles.confirmText}>
              Bu gerekliliği silmek istediğinizden emin misiniz?
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
