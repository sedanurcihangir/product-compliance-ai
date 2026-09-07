"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import {
  createRiskRule,
  deleteRiskRule,
  listRiskRules,
  type RiskRule,
  updateRiskRule,
} from "@/lib/api";
import styles from "./risk-rules.module.css";

type FormMode = "create" | "edit";

type FormState = {
  condition: string;
  risk_level: string;
  explanation: string;
};

const emptyForm: FormState = {
  condition: "",
  risk_level: "",
  explanation: "",
};

export default function RiskRulesPage() {
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RiskRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRiskRules();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Risk kuralları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadRules();
    });
  }, [loadRules]);

  function openCreateForm() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setSuccess(null);
    setFormOpen(true);
  }

  function openEditForm(rule: RiskRule) {
    setFormMode("edit");
    setEditingId(rule.id);
    setForm({
      condition: rule.condition,
      risk_level: rule.risk_level,
      explanation: rule.explanation ?? "",
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

    const condition = form.condition.trim();
    const riskLevel = form.risk_level.trim();
    if (!condition) {
      setFormError("Koşul zorunludur.");
      return;
    }
    if (!riskLevel) {
      setFormError("Risk seviyesi zorunludur.");
      return;
    }

    const payload = {
      condition,
      risk_level: riskLevel,
      explanation: form.explanation.trim() ? form.explanation.trim() : null,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createRiskRule(payload);
        setSuccess("Risk kuralı başarıyla eklendi.");
      } else if (editingId !== null) {
        await updateRiskRule(editingId, payload);
        setSuccess("Risk kuralı başarıyla güncellendi.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      await loadRules();
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
      await deleteRiskRule(deleteTarget.id);
      setSuccess("Risk kuralı silindi.");
      setDeleteTarget(null);
      await loadRules();
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
          <h1 className={styles.title}>Risk Kuralları</h1>
          <p className={styles.subtitle}>
            Uygunluk değerlendirmesinde kullanılacak risk kurallarını oluşturun,
            düzenleyin ve silin.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateForm}>
          Yeni Risk Kuralı Ekle
        </button>
      </header>

      {success ? <div className={styles.successBanner}>{success}</div> : null}
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.panel}>
        {loading ? (
          <p className={styles.stateText}>Yükleniyor...</p>
        ) : rules.length === 0 ? (
          <p className={styles.stateText}>Henüz risk kuralı bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Koşul</th>
                  <th>Risk Seviyesi</th>
                  <th>Açıklama</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.condition}</td>
                    <td>{rule.risk_level}</td>
                    <td>{rule.explanation || "—"}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => openEditForm(rule)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setDeleteTarget(rule)}
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
            aria-labelledby="risk-rule-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="risk-rule-form-title" className={styles.modalTitle}>
              {formMode === "create" ? "Yeni Risk Kuralı" : "Risk Kuralını Düzenle"}
            </h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>
                Koşul
                <textarea
                  className={styles.textarea}
                  value={form.condition}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, condition: event.target.value }))
                  }
                  rows={3}
                  required
                  disabled={saving}
                />
              </label>
              <label className={styles.label}>
                Risk Seviyesi
                <input
                  className={styles.input}
                  value={form.risk_level}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, risk_level: event.target.value }))
                  }
                  required
                  maxLength={255}
                  disabled={saving}
                  placeholder="Serbest metin"
                />
              </label>
              <label className={styles.label}>
                Açıklama
                <textarea
                  className={styles.textarea}
                  value={form.explanation}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      explanation: event.target.value,
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
            aria-labelledby="delete-risk-rule-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-risk-rule-title" className={styles.modalTitle}>
              Risk Kuralını Sil
            </h2>
            <p className={styles.confirmText}>
              Bu risk kuralını silmek istediğinizden emin misiniz?
            </p>
            <p className={styles.confirmName}>{deleteTarget.condition}</p>
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
