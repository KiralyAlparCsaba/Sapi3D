import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/ProfilPage.css";

function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return "";
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base = envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
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
  const avatarSrc = avatarUrl ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}` : "";

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
          })
        );
      }
      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      setSuccess("Profilkép sikeresen frissítve.");
    } catch (e) {
      setError(e?.response?.data?.detail || "A profilkép feltöltése sikertelen.");
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
        })
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
        <button className="profil-refresh" onClick={loadMe} disabled={loading || saving}>
          Frissítés
        </button>

        {!loading && !error && me && !isEditing && (
          <button className="profil-edit" onClick={startEdit}>
            Szerkesztés
          </button>
        )}

        {isEditing && (
          <div className="profil-edit-actions">
            <button className="profil-cancel" onClick={cancelEdit} disabled={saving}>
              Mégse
            </button>
            <button className="profil-save" onClick={saveEdit} disabled={saving}>
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
              <div className="profil-avatar profil-avatar--fallback">{initials}</div>
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
                  : (me?.avatar_url ? "Profilkép módosítása" : "Profilkép feltöltése")}
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
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              <strong className="profil-meta-value">{fmtDate(me.created_at)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}