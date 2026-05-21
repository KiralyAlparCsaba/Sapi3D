import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/ProfilPage.css";
import AchievementsSection, { Medal } from "../components/achievements/AchievementsSection";

// ─── Helpers (unchanged) ───
function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return "";
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base = envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  return `${base.replace(/\/$/, "")}${avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`}`;
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

const HU_MONTHS = ["jan","feb","márc","ápr","máj","jún","júl","aug","szept","okt","nov","dec"];
function fmtDateShort(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fmtDate(value);
  return `${d.getFullYear()}. ${HU_MONTHS[d.getMonth()]} ${d.getDate()}.`;
}

// ─── Inline SVG icons ───
const IconMail = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const IconClock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconRefresh = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
  </svg>
);

const IconEdit = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20h4l11-11-4-4L4 16z" />
    <path d="M14 6l4 4" />
  </svg>
);

// ─── Avatar with SVG progress ring ───
function AvatarWithRing({ initial, avatarSrc, avatarLoadFailed, onAvatarError,
  percent, canClick, onClickAvatar, uploading }) {
  const size   = 220;
  const stroke = 5;
  const r      = size / 2 - stroke - 2;
  const c      = 2 * Math.PI * r;
  const offset = c - c * (percent / 100);

  return (
    <div
      className={`ph-avatar-wrap${canClick ? " is-clickable" : ""}`}
      style={{ width: size, height: size }}
      onClick={canClick ? onClickAvatar : undefined}
      role={canClick ? "button" : undefined}
      tabIndex={canClick ? 0 : undefined}
      onKeyDown={canClick ? (e) => e.key === "Enter" && onClickAvatar() : undefined}
      aria-label={canClick ? "Profilkép módosítása" : undefined}
    >
      <svg
        className="ph-avatar-ring"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle className="ph-ring-track" cx={size / 2} cy={size / 2} r={r} />
        <circle
          className="ph-ring-fill"
          cx={size / 2} cy={size / 2} r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-label="Kihívás haladás"
        />
      </svg>

      <div className="ph-avatar-circle" aria-hidden="true">
        {avatarSrc && !avatarLoadFailed ? (
          <img src={avatarSrc} alt="Profilkép" onError={onAvatarError} />
        ) : (
          <span className="ph-avatar-initial">{initial}</span>
        )}
        {canClick && (
          <div className="ph-avatar-overlay">{uploading ? "…" : "✎"}</div>
        )}
      </div>

      <div className="ph-avatar-pct" aria-hidden="true">{percent}% feltérképezve</div>
    </div>
  );
}

// ════════════════════════════════════════
// ProfilPage
// ════════════════════════════════════════
export default function ProfilPage() {
  const { updateToken } = useAuth();

  // ── User profile state (unchanged) ──
  const [me, setMe]                           = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting]   = useState(false);
  const [avatarVersion, setAvatarVersion]     = useState(0);
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState("");
  const [isEditing, setIsEditing]             = useState(false);
  const [form, setForm]                       = useState({ username: "", email: "" });
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarInputRef = useRef(null);

  // ── Achievement stats received from AchievementsSection via onStatsChange ──
  const [achievementStats, setAchievementStats] = useState({ done: 0, total: 0, currentBadge: null });
  const [achievementRefreshKey, setAchievementRefreshKey] = useState(0);

  // ── Load profile (unchanged) ──
  const loadMe = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await api.get("/auth/me");
      setMe(res.data);
      setForm({ username: res.data?.username ?? "", email: res.data?.email ?? "" });
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load profile.");
      setMe(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadMe(); }, []);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(id);
  }, [success]);

  // ── Edit (unchanged) ──
  const startEdit = () => {
    if (!me) return;
    setError(""); setSuccess("");
    setForm({ username: me.username ?? "", email: me.email ?? "" });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (!me) return;
    setError(""); setSuccess("");
    setForm({ username: me.username ?? "", email: me.email ?? "" });
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!me) return;
    const nextUsername = form.username.trim();
    const nextEmail    = form.email.trim();
    if (!nextUsername) { setError("A felhasználónév nem lehet üres."); return; }
    if (!nextEmail)    { setError("Az e-mail nem lehet üres.");        return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = { username: nextUsername, email: nextEmail, avatar_url: me.avatar_url || "", role_id: me.role_id };
      const res = await api.put(`/users/${me.user_id}`, payload);
      if (res.data?.token) updateToken(res.data.token);
      if (res.data?.user)  setMe((p) => (p ? { ...p, ...res.data.user } : p));
      else                 setMe((p) => (p ? { ...p, ...payload }       : p));
      setIsEditing(false);
      setSuccess("Sikeresen mentve.");
    } catch (e) {
      setError(e?.response?.data?.detail || "Sikertelen mentés.");
    } finally { setSaving(false); }
  };

  // ── Avatar (unchanged) ──
  const triggerAvatarPicker = () => {
    if (avatarUploading || avatarDeleting || loading || !me) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarSelected = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !me) return;
    if (!["image/jpeg", "image/png"].includes(selectedFile.type)) {
      setError("Csak JPG vagy PNG képet tölthetsz fel."); event.target.value = ""; return;
    }
    if (selectedFile.size > 3 * 1024 * 1024) {
      setError("A fájl túl nagy. Maximum méret: 3MB."); event.target.value = ""; return;
    }
    setAvatarUploading(true); setError(""); setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await api.request({
        method: me?.avatar_url ? "put" : "post",
        url:    `/users/${me.user_id}/avatar`,
        data:   formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.user) {
        setMe((p) => (p ? { ...p, ...res.data.user } : p));
        window.dispatchEvent(new CustomEvent("avatar-updated", {
          detail: { userId: me.user_id, avatarUrl: res.data.user.avatar_url || "" },
        }));
      }
      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      setSuccess("Profilkép sikeresen frissítve.");
    } catch (e) {
      setError(e?.response?.data?.detail || "A profilkép feltöltése sikertelen.");
    } finally { setAvatarUploading(false); event.target.value = ""; }
  };

  const deleteAvatar = async () => {
    if (!me?.avatar_url || !me?.user_id) return;
    if (!window.confirm("Biztosan törlöd a profilképedet?")) return;
    setAvatarDeleting(true); setError(""); setSuccess("");
    try {
      const res = await api.delete(`/users/${me.user_id}/avatar`);
      if (res.data?.user) setMe((p) => (p ? { ...p, ...res.data.user } : p));
      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { userId: me.user_id, avatarUrl: "" } }));
      setSuccess("Profilkép törölve.");
    } catch (e) {
      setError(e?.response?.data?.detail || "A profilkép törlése sikertelen.");
    } finally { setAvatarDeleting(false); }
  };

  // ── Derived avatar values (unchanged) ──
  const initials  = ((me?.username || "").trim().charAt(0) || "?").toUpperCase();
  const avatarUrl = resolveAvatarUrl(me?.avatar_url || "");
  const avatarSrc = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : "";
  useEffect(() => { setAvatarLoadFailed(false); }, [avatarUrl]);

  const canClickAvatar = isEditing || !me?.avatar_url;

  // ── Refresh: user profile + achievements ──
  const handleRefresh = () => {
    loadMe();
    setAchievementRefreshKey((k) => k + 1);
  };

  // ── Hero derived values ──
  const { done, total, currentBadge } = achievementStats;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="profil-page">
      {/* Toasts */}
      {error   && <p className="profil-toast profil-toast--error"  role="alert">{error}</p>}
      {success && <p className="profil-toast profil-toast--success" role="status">{success}</p>}

      {loading && !me && <div className="profil-state-msg">Betöltés...</div>}

      {me && (
        <>
          {/* Hidden file input */}
          <input
            ref={avatarInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleAvatarSelected}
            className="profil-avatar-input"
          />

          {/* Two-column grid */}
          <div className="profil-grid">

            {/* ══ LEFT — Profile Hero ══ */}
            <aside className="profil-hero">
              <div className="profil-hero-inner">

                {/* Progress strip */}
                <div className="ph-strip">
                  <div className="ph-strip-left">
                    <div className="ph-strip-num">
                      {done}<small>/{total}</small>
                    </div>
                    <div>
                      <div className="ph-strip-title">Kihívás teljesítve</div>
                      <div className="ph-strip-label">Felfedezésed jelenleg</div>
                    </div>
                  </div>
                  <div className="ph-strip-bar" aria-hidden="true">
                    <div className="ph-strip-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Avatar with progress ring */}
                <AvatarWithRing
                  initial={initials}
                  avatarSrc={avatarSrc}
                  avatarLoadFailed={avatarLoadFailed}
                  onAvatarError={() => setAvatarLoadFailed(true)}
                  percent={pct}
                  canClick={canClickAvatar}
                  onClickAvatar={triggerAvatarPicker}
                  uploading={avatarUploading}
                />

                {/* Name row */}
                <div className="ph-name-row">
                  <div className="ph-greeting">Üdvözlünk újra</div>
                  {!isEditing ? (
                    <h1 className="ph-name">{me.username}</h1>
                  ) : (
                    <input
                      className="ph-name-input"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      disabled={saving}
                      placeholder="Felhasználónév"
                    />
                  )}
                  <div className="ph-role-pill">
                    <span className="ph-role-dot" aria-hidden="true" />
                    {me.role_id === 2 ? "Adminisztrátor" : "Felhasználó"}
                  </div>
                </div>

                {/* Meta cells */}
                <div className="ph-meta-grid">
                  <div className="ph-meta-cell">
                    <div className="ph-meta-lbl">
                      <IconMail width="11" height="11" aria-hidden="true" />
                      E-MAIL
                    </div>
                    {!isEditing ? (
                      <div className="ph-meta-val">{me.email}</div>
                    ) : (
                      <input
                        className="ph-meta-input"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        disabled={saving}
                        placeholder="E-mail"
                      />
                    )}
                  </div>
                  <div className="ph-meta-cell">
                    <div className="ph-meta-lbl">
                      <IconClock width="11" height="11" aria-hidden="true" />
                      CSATLAKOZOTT
                    </div>
                    <div className="ph-meta-val">{fmtDateShort(me.created_at)}</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="ph-divider"><span>Jelenlegi kitűző</span></div>

                {/* Current badge */}
                {currentBadge ? (
                  <div className={`ph-current-badge ph-current-badge--${currentBadge.tier}`}>
                    <div className="ph-current-badge-spin" aria-hidden="true" />
                    <Medal tier={currentBadge.tier} size={56} />
                    <div className="ph-current-badge-text">
                      <div className="ph-current-badge-ttl">{currentBadge.name}</div>
                      <div className="ph-current-badge-sub">{currentBadge.desc}</div>
                      <div className="ph-current-badge-meta">{done} teljesített kihívás alapján</div>
                    </div>
                  </div>
                ) : (
                  <div className="ph-current-badge-empty">
                    Még nincs kitűződ — teljesíts kihívásokat!
                  </div>
                )}

                {/* Action buttons */}
                {!isEditing ? (
                  <div className="ph-actions">
                    <button
                      className="ph-btn ph-btn--ghost"
                      onClick={handleRefresh}
                      disabled={loading || saving}
                    >
                      <IconRefresh width="14" height="14" aria-hidden="true" />
                      Frissítés
                    </button>
                    <button
                      className="ph-btn ph-btn--primary"
                      onClick={startEdit}
                      disabled={loading || saving}
                    >
                      <IconEdit width="14" height="14" aria-hidden="true" />
                      Szerkesztés
                    </button>
                  </div>
                ) : (
                  <div className="ph-actions">
                    <button
                      className="ph-btn ph-btn--ghost"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Mégse
                    </button>
                    <button
                      className="ph-btn ph-btn--primary"
                      onClick={saveEdit}
                      disabled={saving}
                    >
                      {saving ? "Mentés..." : "Mentés"}
                    </button>
                  </div>
                )}

                {isEditing && me?.avatar_url && (
                  <button
                    type="button"
                    className="ph-avatar-delete-btn"
                    onClick={deleteAvatar}
                    disabled={avatarUploading || avatarDeleting}
                  >
                    {avatarDeleting ? "Törlés..." : "Profilkép törlése"}
                  </button>
                )}

              </div>
            </aside>

            {/* ══ RIGHT — Badges + Challenges ══ */}
            <div className="profil-right-col">
              <AchievementsSection
                onStatsChange={setAchievementStats}
                refreshKey={achievementRefreshKey}
              />
            </div>

          </div>
        </>
      )}
    </div>
  );
}
