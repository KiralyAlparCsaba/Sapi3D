import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import "../styles/AdminPage.css";

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

export default function AdminPage() {
  const usersRequestRef = useRef(0);
  const sessionsRequestRef = useRef(0);
  const rawRequestRef = useRef(0);

  // ───────── USERS ─────────
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const skip = useMemo(() => (page - 1) * limit, [page, limit]);

  const [search, setSearch] = useState("");
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const a = (u.username ?? "").toLowerCase();
      const b = (u.email ?? "").toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [users, search]);

  const [selectedUserId, setSelectedUserId] = useState(null);

  // ───────── SESSIONS ─────────
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // ───────── METRICS (RAW) ─────────
  const [rawMetrics, setRawMetrics] = useState(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState("");

  // ───────── USER ADMIN ACTIONS ─────────
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role_id: 1,
  });
  const avatarInputRef = useRef(null);
  const [avatarActionLoading, setAvatarActionLoading] = useState(false);
  const [avatarActionType, setAvatarActionType] = useState(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const openEditSelectedUser = () => {
    if (!selectedUser) return;
    setUserActionError("");
    setUserActionSuccess("");
    setEditForm({
      username: selectedUser.username ?? "",
      email: selectedUser.email ?? "",
      role_id: selectedUser.role_id ?? 1,
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
  };

  const triggerSelectedUserAvatarPicker = () => {
    if (!selectedUser || avatarActionLoading || userActionLoading) return;
    avatarInputRef.current?.click();
  };

  const uploadSelectedUserAvatar = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !selectedUser) return;

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setUserActionError("Csak JPG vagy PNG képet tölthetsz fel.");
      event.target.value = "";
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setUserActionError("A fájl túl nagy. Maximum méret: 3MB.");
      event.target.value = "";
      return;
    }

    setAvatarActionLoading(true);
    setAvatarActionType("upload");
    setUserActionError("");
    setUserActionSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const method = selectedUser.avatar_url ? "put" : "post";
      const res = await api.request({
        method,
        url: `/users/${selectedUser.user_id}/avatar`,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser = res.data?.user;
      if (updatedUser) {
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === selectedUser.user_id ? { ...u, ...updatedUser } : u,
          ),
        );
      }

      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      window.dispatchEvent(
        new CustomEvent("avatar-updated", {
          detail: { userId: selectedUser.user_id },
        }),
      );
      setUserActionSuccess("Profilkép sikeresen frissítve.");
    } catch (e) {
      setUserActionError(
        e?.response?.data?.detail || "A profilkép frissítése sikertelen.",
      );
    } finally {
      setAvatarActionLoading(false);
      setAvatarActionType(null);
      event.target.value = "";
    }
  };

  const deleteSelectedUserAvatar = async () => {
    if (!selectedUser?.avatar_url || !selectedUser?.user_id) return;

    const ok = window.confirm(
      `Biztosan törlöd ${selectedUser.username} profilképét?`,
    );
    if (!ok) return;

    setAvatarActionLoading(true);
    setAvatarActionType("delete");
    setUserActionError("");
    setUserActionSuccess("");

    try {
      const res = await api.delete(`/users/${selectedUser.user_id}/avatar`);
      const updatedUser = res.data?.user;

      if (updatedUser) {
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === selectedUser.user_id ? { ...u, ...updatedUser } : u,
          ),
        );
      }

      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
      window.dispatchEvent(
        new CustomEvent("avatar-updated", {
          detail: { userId: selectedUser.user_id },
        }),
      );
      setUserActionSuccess("Profilkép törölve.");
    } catch (e) {
      setUserActionError(
        e?.response?.data?.detail || "A profilkép törlése sikertelen.",
      );
    } finally {
      setAvatarActionLoading(false);
      setAvatarActionType(null);
    }
  };

  // ───────── DERIVED ─────────
  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === Number(selectedUserId)) ?? null,
    [users, selectedUserId],
  );

  const selectedSession = useMemo(
    () =>
      sessions.find((s) => s.session_id === Number(selectedSessionId)) ?? null,
    [sessions, selectedSessionId],
  );

  const selectedAvatarUrl = resolveAvatarUrl(selectedUser?.avatar_url || "");
  const selectedAvatarSrc = selectedAvatarUrl
    ? `${selectedAvatarUrl}${selectedAvatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : "";
  const selectedInitial =
    (selectedUser?.username || "?").trim().charAt(0).toUpperCase() || "?";

  const canPrevUsers = page > 1;
  const canNextUsers = users.length === limit;

  // ───────── LOADERS ─────────
  const resetSessionAndMetrics = () => {
    rawRequestRef.current += 1;
    setSessions([]);
    setSelectedSessionId(null);
    setRawMetrics(null);
    setRawLoading(false);
    setRawError("");
  };

  const loadUsersPage = async () => {
    const requestId = ++usersRequestRef.current;
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await api.get(`/users/?skip=${skip}&limit=${limit}`);
      if (usersRequestRef.current !== requestId) return;
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (usersRequestRef.current !== requestId) return;
      const msg = "Failed to load users.";
      setUsersError(msg);
      setUsers([]);
    } finally {
      if (usersRequestRef.current !== requestId) return;
      setUsersLoading(false);
    }
  };

  const loadAllUsers = async () => {
    const requestId = ++usersRequestRef.current;
    setUsersLoading(true);
    setUsersError("");
    setSearch("");
    setSelectedUserId(null);
    sessionsRequestRef.current += 1;
    setSessionsLoading(false);
    resetSessionAndMetrics();

    const all = [];
    let localSkip = 0;

    try {
      while (true) {
        const res = await api.get(`/users/?skip=${localSkip}&limit=${limit}`);
        if (usersRequestRef.current !== requestId) return;
        const batch = Array.isArray(res.data) ? res.data : [];
        if (batch.length === 0) break;

        all.push(...batch);

        if (batch.length < limit) break;
        localSkip += limit;
      }
      if (usersRequestRef.current !== requestId) return;
      setUsers(all);
    } catch (e) {
      if (usersRequestRef.current !== requestId) return;
      const msg = "Failed to load all users.";
      setUsersError(msg);
      setUsers(all);
    } finally {
      if (usersRequestRef.current !== requestId) return;
      setUsersLoading(false);
    }
  };

  const loadSessionsForUser = async (userId) => {
    if (!userId) return;
    const requestId = ++sessionsRequestRef.current;
    setSessionsLoading(true);
    setSessionsError("");
    resetSessionAndMetrics();

    try {
      const res = await api.get(`/sessions/?user_id=${userId}`);
      if (sessionsRequestRef.current !== requestId) return;
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (sessionsRequestRef.current !== requestId) return;
      const msg = "Failed to load sessions.";
      setSessionsError(msg);
      setSessions([]);
    } finally {
      if (sessionsRequestRef.current !== requestId) return;
      setSessionsLoading(false);
    }
  };

  const loadRawMetrics = async (sessionId) => {
    if (!sessionId) return;
    const requestId = ++rawRequestRef.current;
    setRawLoading(true);
    setRawError("");
    setRawMetrics(null);

    try {
      const res = await api.get(`/sessions/${sessionId}/metrics`);
      if (rawRequestRef.current !== requestId) return;
      setRawMetrics(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (rawRequestRef.current !== requestId) return;
      const msg = "Failed to load metrics samples.";
      setRawError(msg);
      setRawMetrics([]);
    } finally {
      if (rawRequestRef.current !== requestId) return;
      setRawLoading(false);
    }
  };

  const deleteSelectedUser = async () => {
    if (!selectedUserId) return;

    const ok = window.confirm(
      `Biztos törlöd ezt a felhasználót? (ID: ${selectedUserId})`,
    );
    if (!ok) return;

    setUserActionLoading(true);
    setUserActionError("");
    setUserActionSuccess("");

    try {
      await api.delete(`/users/${selectedUserId}`);

      setUsers((prev) =>
        prev.filter((u) => u.user_id !== Number(selectedUserId)),
      );

      setSelectedUserId(null);
      sessionsRequestRef.current += 1;
      rawRequestRef.current += 1;
      setSessions([]);
      setSelectedSessionId(null);
      setRawMetrics(null);

      setUserActionSuccess("Felhasználó törölve.");
    } catch (e) {
      setUserActionError(e?.response?.data?.detail || "Failed to delete user.");
    } finally {
      setUserActionLoading(false);
    }
  };

  const saveSelectedUserEdit = async () => {
    if (!selectedUser) return;

    const nextUsername = editForm.username.trim();
    const nextEmail = editForm.email.trim();
    const nextRoleId = Number(editForm.role_id);

    if (!nextUsername) {
      setUserActionError("A felhasználónév nem lehet üres.");
      return;
    }
    if (!nextEmail) {
      setUserActionError("Az e-mail nem lehet üres.");
      return;
    }

    setUserActionLoading(true);
    setUserActionError("");
    setUserActionSuccess("");

    try {
      const payload = {
        username: nextUsername,
        email: nextEmail,
        avatar_url: selectedUser.avatar_url || "",
        role_id: nextRoleId,
      };

      const res = await api.put(`/users/${selectedUser.user_id}`, payload);

      const updated = res.data?.user ? res.data.user : payload;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id ? { ...u, ...updated } : u,
        ),
      );

      setEditOpen(false);
      setUserActionSuccess("Sikeresen mentve.");
    } catch (e) {
      setUserActionError(e?.response?.data?.detail || "Sikertelen mentés.");
    } finally {
      setUserActionLoading(false);
    }
  };

  // ───────── EFFECTS ─────────
  useEffect(() => {
    loadUsersPage();
  }, [limit, page]);

  useEffect(() => {
    setAvatarLoadFailed(false);
    setAvatarVersion(0);
  }, [selectedUserId]);

  // ───────── UI ─────────
  return (
    <>
      <div className="admin-page">
        <h1 className="admin-page__title">Admin – Sessionök és metrikák</h1>

        <div className="admin-page__grid">
          {/* ───────── LEFT: USERS ───────── */}
          <section className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Felhasználók</h2>
              <button onClick={loadUsersPage} disabled={usersLoading}>
                Frissítés
              </button>
            </div>

            <div className="admin-controls">
              <label className="admin-limit-label">
                Limit:
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                >
                  {[5, 25, 50, 100, 200, 500].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrevUsers || usersLoading}
              >
                Előző
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNextUsers || usersLoading}
              >
                Következő
              </button>

              <button
                onClick={loadAllUsers}
                disabled={usersLoading}
                title="Végigkéri az összes oldalt, amíg elfogy a lista"
              >
                Összes betöltése
              </button>
            </div>

            <input
              className="admin-search-input"
              placeholder="Keresés (username / email)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {usersLoading && <p className="admin-status">Betöltés…</p>}
            {usersError && (
              <p className="admin-status admin-error">{usersError}</p>
            )}

            {!usersLoading && !usersError && (
              <div className="admin-list">
                {filteredUsers.map((u) => {
                  const isSelected = Number(selectedUserId) === u.user_id;
                  return (
                    <div
                      key={u.user_id}
                      onClick={() => {
                        setSelectedUserId(u.user_id);
                        loadSessionsForUser(u.user_id);
                      }}
                      className={`admin-user-item${isSelected ? " is-selected" : ""}`}
                    >
                      <div className="admin-user-head">
                        <strong>{u.username}</strong>
                        <span className="admin-user-role">
                          {u.role_id === 2 ? "ADMIN" : "USER"}
                        </span>
                      </div>
                      <div className="admin-user-email">{u.email}</div>
                      <div className="admin-user-id">ID: {u.user_id}</div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="admin-empty">Nincs találat</div>
                )}
              </div>
            )}
          </section>

          {/* ───────── MIDDLE: SESSIONS ───────── */}
          <section className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">
                Sessionök{" "}
                {selectedUser
                  ? `– ${selectedUser.username} (ID: ${selectedUser.user_id})`
                  : ""}
              </h2>
              <button
                onClick={() =>
                  selectedUserId && loadSessionsForUser(selectedUserId)
                }
                disabled={!selectedUserId || sessionsLoading}
              >
                Frissítés
              </button>
            </div>

            {!selectedUserId && (
              <p className="admin-status admin-muted">
                Válassz egy felhasználót bal oldalt.
              </p>
            )}
            {sessionsLoading && <p className="admin-status">Betöltés…</p>}
            {sessionsError && (
              <p className="admin-status admin-error">{sessionsError}</p>
            )}

            {!sessionsLoading && !sessionsError && selectedUserId && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {[
                        "Session azonosító",
                        "Státusz",
                        "Indult",
                        "Lezárt",
                        "Eszköz",
                        "Alkalmazásverzió",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const isActive = !s.ended_at;
                      const isSelected =
                        Number(selectedSessionId) === s.session_id;

                      return (
                        <tr
                          key={s.session_id}
                          className={isSelected ? "is-selected" : ""}
                          onClick={() => {
                            setSelectedSessionId(s.session_id);
                            loadRawMetrics(s.session_id);
                          }}
                        >
                          <td>{s.session_id}</td>
                          <td>{isActive ? "🟢 Aktív" : "⚪ Lezárt"}</td>
                          <td>{fmtDate(s.started_at)}</td>
                          <td>{fmtDate(s.ended_at)}</td>
                          <td>{s.device_type ?? "-"}</td>
                          <td>{s.app_version ?? "-"}</td>
                        </tr>
                      );
                    })}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          Nincs session ehhez a felhasználóhoz.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ───────── RIGHT: METRICS ───────── */}
          <section className="admin-card">
            <div className="admin-card__header admin-card__header--row">
              <h2 className="admin-card__title">Session részletek</h2>

              <div className="admin-header-actions">
                <button
                  onClick={openEditSelectedUser}
                  disabled={!selectedUser || userActionLoading}
                  title={
                    !selectedUser ? "Válassz egy felhasználót bal oldalt." : ""
                  }
                >
                  User szerkesztése
                </button>

                <button
                  onClick={deleteSelectedUser}
                  disabled={!selectedUser || userActionLoading}
                  title={
                    !selectedUser ? "Válassz egy felhasználót bal oldalt." : ""
                  }
                >
                  User törlése
                </button>
              </div>
            </div>
            {userActionError && (
              <p className="admin-status admin-error">{userActionError}</p>
            )}
            {userActionSuccess && (
              <p className="admin-status">{userActionSuccess}</p>
            )}

            {selectedUser && (
              <div className="admin-avatar-panel">
                <div className="admin-avatar-preview-wrap">
                  {selectedAvatarSrc && !avatarLoadFailed ? (
                    <img
                      src={selectedAvatarSrc}
                      alt="Selected user avatar"
                      className="admin-avatar-preview"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    <div className="admin-avatar-preview admin-avatar-preview--fallback">
                      {selectedInitial}
                    </div>
                  )}
                  <div className="admin-avatar-meta">
                    <strong>Profilkép</strong>
                    <span>{selectedUser.username}</span>
                  </div>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={uploadSelectedUserAvatar}
                  className="admin-avatar-input"
                />

                <button
                  onClick={triggerSelectedUserAvatarPicker}
                  disabled={avatarActionLoading || userActionLoading}
                  className="admin-avatar-button"
                  type="button"
                >
                  {avatarActionLoading && avatarActionType === "upload"
                    ? "Feltöltés..."
                    : selectedUser.avatar_url
                      ? "Profilkép módosítása"
                      : "Profilkép feltöltése"}
                </button>

                {selectedUser.avatar_url && (
                  <button
                    onClick={deleteSelectedUserAvatar}
                    disabled={avatarActionLoading || userActionLoading}
                    className="admin-avatar-button admin-avatar-button--danger"
                    type="button"
                  >
                    {avatarActionLoading && avatarActionType === "delete"
                      ? "Törlés..."
                      : "Profilkép törlése"}
                  </button>
                )}
              </div>
            )}

            {!selectedSessionId && (
              <p className="admin-status admin-muted">
                Kattints egy sessionre a táblázatban.
              </p>
            )}

            {selectedSession && (
              <div className="admin-detail-box">
                <div>
                  <strong>Session azonosító:</strong>{" "}
                  {selectedSession.session_id}
                </div>
                <div>
                  <strong>Felhasználó azonosító:</strong>{" "}
                  {selectedSession.user_id}
                </div>
                <div>
                  <strong>Indult:</strong> {fmtDate(selectedSession.started_at)}
                </div>
                <div>
                  <strong>Lezárt:</strong> {fmtDate(selectedSession.ended_at)}
                </div>
                <div>
                  <strong>Eszköz:</strong> {selectedSession.device_type ?? "-"}
                </div>
                <div>
                  <strong>Alkalmazásverzió:</strong>{" "}
                  {selectedSession.app_version ?? "-"}
                </div>
              </div>
            )}

            {selectedSessionId && (
              <>
                <div className="admin-metrics-header">
                  <h3 className="admin-metrics-title">Minták</h3>
                  <button
                    onClick={() =>
                      selectedSessionId && loadRawMetrics(selectedSessionId)
                    }
                    disabled={!selectedSessionId || rawLoading}
                  >
                    Frissítés
                  </button>
                </div>

                <div className="admin-metrics-meta">
                  <span className="admin-pill">
                    Kiválasztott session: #{selectedSessionId}
                  </span>
                </div>

                {rawLoading && (
                  <p className="admin-status">Minták betöltése...</p>
                )}
                {rawError && (
                  <p className="admin-status admin-error">{rawError}</p>
                )}

                {rawMetrics && (
                  <div className="admin-metrics-list">
                    {rawMetrics.map((m) => (
                      <article key={m.metrics_id} className="admin-metric-card">
                        <div className="admin-metric-row">
                          <span className="admin-metric-label">Időpont</span>
                          <span className="admin-metric-value admin-metric-value--time">
                            {fmtDate(m.timestamp)}
                          </span>
                        </div>
                        <div className="admin-metric-grid">
                          <div className="admin-metric-stat">
                            <span className="admin-metric-label">FPS</span>
                            <strong className="admin-metric-value">
                              {m.fps}
                            </strong>
                          </div>
                          <div className="admin-metric-stat">
                            <span className="admin-metric-label">
                              Memória (MB)
                            </span>
                            <strong className="admin-metric-value">
                              {m.memory_mb}
                            </strong>
                          </div>
                          <div className="admin-metric-stat">
                            <span className="admin-metric-label">
                              Késleltetés (ms)
                            </span>
                            <strong className="admin-metric-value">
                              {m.latency_ms}
                            </strong>
                          </div>
                          <div className="admin-metric-stat">
                            <span className="admin-metric-label">ID</span>
                            <strong className="admin-metric-value">
                              {m.metrics_id}
                            </strong>
                          </div>
                        </div>
                      </article>
                    ))}
                    {rawMetrics.length === 0 && (
                      <div className="admin-empty">
                        Nincs minta ehhez a sessionhöz.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {editOpen && (
        <div className="admin-modal-backdrop" onClick={closeEdit}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">Felhasználó szerkesztése</h3>

            <label className="admin-field">
              Felhasználónév
              <input
                value={editForm.username}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, username: e.target.value }))
                }
                disabled={userActionLoading}
              />
            </label>

            <label className="admin-field">
              E-mail
              <input
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, email: e.target.value }))
                }
                disabled={userActionLoading}
              />
            </label>

            <label className="admin-field">
              Szerepkör
              <select
                value={editForm.role_id}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    role_id: Number(e.target.value),
                  }))
                }
                disabled={userActionLoading}
              >
                <option value={1}>USER</option>
                <option value={2}>ADMIN</option>
              </select>
            </label>

            <div className="admin-modal-actions">
              <button onClick={closeEdit} disabled={userActionLoading}>
                Mégse
              </button>
              <button
                onClick={saveSelectedUserEdit}
                disabled={userActionLoading}
              >
                {userActionLoading ? "Mentés..." : "Mentés"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
