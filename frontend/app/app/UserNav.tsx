"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { getCurrentUser, logoutUser, type AuthUser } from "@/lib/api";
import styles from "./user.module.css";

function displayNameFromUser(user: AuthUser): string {
  const local = user.email.split("@")[0] || user.email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return user.email;
  return parts
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export default function UserNav() {
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getCurrentUser();
        if (cancelled) return;
        setUser(me);
        setOpen(false);
      } catch {
        if (cancelled) return;
        setUser(null);
        setOpen(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutUser();
    } catch {
      // Clear local session view even if request fails.
    }
    setUser(null);
    router.push("/app");
    router.refresh();
  }

  return (
    <nav
      className={styles.nav}
      aria-label="Kullanıcı paneli"
      data-testid="user-nav"
    >
      <Link href="/app" className={styles.navLink}>
        Ana Sayfa
      </Link>

      {loading ? (
        <span className={styles.navMuted}>…</span>
      ) : user ? (
        <>
          <Link href="/app/evaluate" className={styles.navLink}>
            Yeni Değerlendirme
          </Link>
          <Link href="/app/evaluations" className={styles.navLink}>
            Geçmiş Değerlendirmeler
          </Link>
          <Link href="/app/analytics" className={styles.navLink}>
            Analiz
          </Link>
          <div className={styles.profileRoot} ref={rootRef}>
            <button
              type="button"
              className={styles.profileButton}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              data-testid="profile-menu-button"
              onClick={() => setOpen((prev) => !prev)}
            >
              <span className={styles.profileAvatar} aria-hidden>
                {displayNameFromUser(user).charAt(0)}
              </span>
              <span className={styles.profileName}>
                {displayNameFromUser(user)}
              </span>
            </button>
            {open ? (
              <div
                className={styles.profileMenu}
                id={menuId}
                role="menu"
                data-testid="profile-menu"
              >
                <div className={styles.profileInfo}>
                  <strong>{displayNameFromUser(user)}</strong>
                  <span>{user.email}</span>
                </div>
                <button
                  type="button"
                  className={styles.profileLogout}
                  role="menuitem"
                  data-testid="logout-button"
                  onClick={() => {
                    void handleLogout();
                  }}
                >
                  Çıkış Yap
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <Link href="/app/login" className={styles.navLink}>
            Giriş
          </Link>
          <Link href="/app/register" className={styles.navLink}>
            Kayıt
          </Link>
        </>
      )}
    </nav>
  );
}
