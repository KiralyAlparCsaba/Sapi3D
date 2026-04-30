import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/ProfilPage.css";

const STATIC_ACHIEVEMENTS = [
  {
    id: 1,
    name: "Első lépések",
    description: "Megnyitottad a 3D modellt legalább egyszer.",
    condition: "Modell megtekintése 1x",
    current: 1,
    target: 1,
    unlocked: true,
    category: "3D",
  },
  {
    id: 2,
    name: "Helyszínvadász I",
    description: "Felfedeztél legalább 3 fontos helyszínt.",
    condition: "3 helyszín megtekintése",
    current: 3,
    target: 3,
    unlocked: true,
    category: "Helyszín",
  },
  {
    id: 3,
    name: "Helyszínvadász II",
    description: "Felfedeztél legalább 5 fontos helyszínt.",
    condition: "5 helyszín megtekintése",
    current: 4,
    target: 5,
    unlocked: false,
    category: "Helyszín",
  },
  {
    id: 4,
    name: "Panelfelfedező",
    description: "Információs panelek böngészése a modellben.",
    condition: "5 panel megnyitása",
    current: 5,
    target: 5,
    unlocked: true,
    category: "Infó",
  },
  {
    id: 5,
    name: "Terepszemle",
    description: "Összesen legalább 10 percet töltöttél bejárással.",
    condition: "10 perc aktív bejárás",
    current: 8,
    target: 10,
    unlocked: false,
    category: "Idő",
  },
  {
    id: 6,
    name: "Egyetem turista",
    description: "Ránéztél a legfontosabb egyetemi pontokra.",
    condition: "Aula, Könyvtár és tanszékek megtekintése",
    current: 3,
    target: 3,
    unlocked: true,
    category: "Főbb pontok",
  },
];

const BADGE_TIERS = [
  {
    id: "badge-bronze",
    name: "Bronz Felfedező",
    threshold: 2,
    icon: "🥉",
    flavor: "Megkezdted az utat az egyetem titkai felé.",
  },
  {
    id: "badge-silver",
    name: "Ezüst Navigátor",
    threshold: 4,
    icon: "🥈",
    flavor: "Már rutinosan mozogsz a fontos helyszínek között.",
  },
  {
    id: "badge-gold",
    name: "Arany Legendás",
    threshold: 6,
    icon: "🏆",
    flavor: "A teljes 3D egyetem felfedezés mesterfokon.",
  },
];

function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return "";
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base =
    envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = avatarUrl.startsWith("/")
    ? avatarUrl
    : `/${avatarUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function ProfilPage() {
  const { updateToken } = useAuth();
  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ username: "", email: "" });
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarInputRef = useRef(null);
  const unlockedAchievements = STATIC_ACHIEVEMENTS.filter(
    (item) => item.unlocked,
  );
  const unlockedCount = unlockedAchievements.length;
  const earnedBadges = BADGE_TIERS.filter(
    (tier) => unlockedCount >= tier.threshold,
  );
  const currentBadge = earnedBadges.length
    ? earnedBadges[earnedBadges.length - 1]
    : null;

  const loadMe = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.get("/auth/me");
      setMe(res.data);
      setForm({
        username: res.data?.username ?? "",
        email: res.data?.email ?? "",
      });
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load profile.");
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const initials = (() => {
    const raw = (me?.username || "").trim();
    if (!raw) return "?";
    return raw.charAt(0).toUpperCase();
  })();

  const avatarUrl = resolveAvatarUrl(me?.avatar_url || "");
  const avatarSrc = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : "";

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [success]);

  const startEdit = () => {
    if (!me) return;
    setError("");
    setSuccess("");
    setForm({
      username: me.username ?? "",
      email: me.email ?? "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (!me) return;
    setError("");
    setSuccess("");
    setForm({
      username: me.username ?? "",
      email: me.email ?? "",
    });
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!me) return;

    const nextUsername = form.username.trim();
    const nextEmail = form.email.trim();

    if (!nextUsername) {
      setError("A felhasználónév nem lehet üres.");
      return;
    }
    if (!nextEmail) {
      setError("Az e-mail nem lehet üres.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        username: nextUsername,
        email: nextEmail,
        avatar_url: me.avatar_url || "",
        role_id: me.role_id,
      };

      const res = await api.put(`/users/${me.user_id}`, payload);

      if (res.data?.token) {
        updateToken(res.data.token);
      }

      if (res.data?.user) {
        setMe((prev) => (prev ? { ...prev, ...res.data.user } : prev));
      } else {
        setMe((prev) => (prev ? { ...prev, ...payload } : prev));
      }

      setIsEditing(false);
      setSuccess("Sikeresen mentve.");
    } catch (e) {
      setError(e?.response?.data?.detail || "Sikertelen mentés.");
    } finally {
      setSaving(false);
    }
  };

  const triggerAvatarPicker = () => {
    if (avatarUploading || avatarDeleting || loading || !me) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarSelected = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !me) return;

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Csak JPG vagy PNG képet tölthetsz fel.");
      event.target.value = "";
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError("A fájl túl nagy. Maximum méret: 3MB.");
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const requestMethod = me?.avatar_url ? "put" : "post";
      const res = await api.request({
        method: requestMethod,
        url: `/users/${me.user_id}/avatar`,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.user) {
        setMe((prev) => (prev ? { ...prev, ...res.data.user } : prev));
        window.dispatchEvent(
          new CustomEvent("avatar-updated", {
            detail: {
              userId: me.user_id,
              avatarUrl: res.data.user.avatar_url || "",
            },
          }),
        );
      }
      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      setSuccess("Profilkép sikeresen frissítve.");
    } catch (e) {
      setError(
        e?.response?.data?.detail || "A profilkép feltöltése sikertelen.",
      );
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const deleteAvatar = async () => {
    if (!me?.avatar_url || !me?.user_id) return;

    const ok = window.confirm("Biztosan törlöd a profilképedet?");
    if (!ok) return;

    setAvatarDeleting(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.delete(`/users/${me.user_id}/avatar`);
      if (res.data?.user) {
        setMe((prev) => (prev ? { ...prev, ...res.data.user } : prev));
      }
      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      window.dispatchEvent(
        new CustomEvent("avatar-updated", {
          detail: {
            userId: me.user_id,
            avatarUrl: "",
          },
        }),
      );
      setSuccess("Profilkép törölve.");
    } catch (e) {
      setError(e?.response?.data?.detail || "A profilkép törlése sikertelen.");
    } finally {
      setAvatarDeleting(false);
    }
  };

  return (
    <div className="profil-page">
      <div className="profil-header-row">
        <button
          className="profil-refresh"
          onClick={loadMe}
          disabled={loading || saving}
        >
          Frissítés
        </button>

        {!loading && !error && me && !isEditing && (
          <button className="profil-edit" onClick={startEdit}>
            Szerkesztés
          </button>
        )}

        {isEditing && (
          <div className="profil-edit-actions">
            <button
              className="profil-cancel"
              onClick={cancelEdit}
              disabled={saving}
            >
              Mégse
            </button>
            <button
              className="profil-save"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? "Mentés..." : "Mentés"}
            </button>
          </div>
        )}
      </div>

      {loading && <p>Betöltés...</p>}
      {error && <p className="profil-error">{error}</p>}
      {success && <p className="profil-success">{success}</p>}

      {!loading && !error && me && (
        <div className="profil-card">
          <div className="profil-avatar-wrap">
            {avatarSrc && !avatarLoadFailed ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="profil-avatar"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="profil-avatar profil-avatar--fallback">
                {initials}
              </div>
            )}
          </div>

          {(!me?.avatar_url || isEditing) && (
            <div className="profil-avatar-actions">
              <input
                ref={avatarInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleAvatarSelected}
                className="profil-avatar-input"
              />
              <button
                type="button"
                className="profil-avatar-upload"
                onClick={triggerAvatarPicker}
                disabled={avatarUploading || avatarDeleting || loading}
              >
                {avatarUploading
                  ? "Feltöltés..."
                  : me?.avatar_url
                    ? "Profilkép módosítása"
                    : "Profilkép feltöltése"}
              </button>
              {isEditing && me?.avatar_url && (
                <button
                  type="button"
                  className="profil-avatar-delete"
                  onClick={deleteAvatar}
                  disabled={avatarUploading || avatarDeleting || loading}
                >
                  {avatarDeleting ? "Törlés..." : "Profilkép törlése"}
                </button>
              )}
            </div>
          )}

          <div className="profil-meta">
            <div className="profil-meta-item">
              <span className="profil-meta-label">Felhasználónév</span>
              {!isEditing ? (
                <strong className="profil-meta-value">{me.username}</strong>
              ) : (
                <input
                  className="profil-input"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  disabled={saving}
                />
              )}
            </div>

            <div className="profil-meta-item">
              <span className="profil-meta-label">E-mail</span>
              {!isEditing ? (
                <strong className="profil-meta-value">{me.email}</strong>
              ) : (
                <input
                  className="profil-input"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  disabled={saving}
                />
              )}
            </div>

            <div className="profil-meta-item">
              <span className="profil-meta-label">Szerepkör</span>
              <strong className="profil-meta-value">
                {me.role_id === 2 ? "Adminisztrátor" : "Felhasználó"}
              </strong>
            </div>

            <div className="profil-meta-item">
              <span className="profil-meta-label">Csatlakozás ideje</span>
              <strong className="profil-meta-value">
                {fmtDate(me.created_at)}
              </strong>
            </div>
          </div>

          <section className="profil-achievements" aria-label="Kihívás lista">
            <div className="profil-achievements-head">
              <h3>Kihívások</h3>
              <span className="profil-achievements-count">
                {unlockedCount}/{STATIC_ACHIEVEMENTS.length}
              </span>
            </div>

            <div className="profil-current-badge" aria-label="Jelenlegi kitűző">
              <span className="profil-current-badge-label">
                Jelenlegi kitűző
              </span>
              {currentBadge ? (
                <div className="profil-current-badge-card">
                  <span
                    className="profil-current-badge-icon"
                    aria-hidden="true"
                  >
                    {currentBadge.icon}
                  </span>
                  <div className="profil-current-badge-copy">
                    <strong>{currentBadge.name}</strong>
                    <span>{currentBadge.flavor}</span>
                    <small>{unlockedCount} teljesített kihívás alapján</small>
                  </div>
                </div>
              ) : (
                <div className="profil-current-badge-empty">
                  Még nincs kitűződ. Teljesíts legalább{" "}
                  {BADGE_TIERS[0].threshold} kihívást.
                </div>
              )}
            </div>

            <div className="profil-badges" aria-label="Kitűzők">
              <div className="profil-badges-head">
                <h4>Kitűzők</h4>
                <span className="profil-badges-subtitle">
                  {earnedBadges.length > 0
                    ? `${earnedBadges.length} megszerzett kitűző`
                    : "Teljesíts kihívásokat a kitűzőkért"}
                </span>
              </div>

              <div className="profil-badges-grid">
                {BADGE_TIERS.map((tier) => {
                  const unlocked = unlockedCount >= tier.threshold;

                  return (
                    <article
                      key={tier.id}
                      className={`profil-badge-card ${unlocked ? "is-unlocked" : "is-locked"}`}
                    >
                      <span className="profil-badge-icon" aria-hidden="true">
                        {tier.icon}
                      </span>
                      <div className="profil-badge-copy">
                        <strong>{tier.name}</strong>
                        <span>{tier.flavor}</span>
                        <small>{tier.threshold} kihívás szükséges</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="profil-achievements-grid">
              {STATIC_ACHIEVEMENTS.map((item) => {
                const progress = Math.min(
                  100,
                  Math.round((item.current / item.target) * 100),
                );

                return (
                  <article
                    key={item.id}
                    className={`profil-achievement-card ${item.unlocked ? "is-unlocked" : "is-locked"}`}
                  >
                    <div className="profil-achievement-top">
                      <span className="profil-achievement-category">
                        {item.category}
                      </span>
                      <span className="profil-achievement-state">
                        {item.unlocked ? "Teljesítve" : "Folyamatban"}
                      </span>
                    </div>

                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <small>{item.condition}</small>

                    <div
                      className="profil-achievement-progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={item.target}
                      aria-valuenow={item.current}
                    >
                      <div
                        className="profil-achievement-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <span className="profil-achievement-progress-text">
                      {item.current}/{item.target}
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
