import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/ProfilPage.css";

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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ username: "", email: "" });

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

  const avatarUrl = me?.avatar_url || "";

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
        role_id: me.role_id, // nem szerkeszthető
      };

      // ✅ user_id + PUT /users/{user_id}
      const res = await api.put(`/users/${me.user_id}`, payload);

      // 🔑 Az új token a válaszban van
      if (res.data?.token) {
        updateToken(res.data.token);
      }

      // Frissítsd az UI-t az új adatokkal
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
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="profil-avatar" />
            ) : (
              <div className="profil-avatar profil-avatar--fallback">{initials}</div>
            )}
          </div>

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