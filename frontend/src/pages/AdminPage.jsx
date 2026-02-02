import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import "../styles/AdminPage.css";
 

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
  const [page, setPage] = useState(1); // 1-indexed
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

  // ───────── DERIVED ─────────
  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === Number(selectedUserId)) ?? null,
    [users, selectedUserId]
  );

  const selectedSession = useMemo(
    () => sessions.find((s) => s.session_id === Number(selectedSessionId)) ?? null,
    [sessions, selectedSessionId]
  );

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
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni a felhasználókat.";
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
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni az összes felhasználót.";
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
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni a sessionöket.";
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
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni a mintákat.";
      setRawError(msg);
      setRawMetrics([]);
    } finally {
      if (rawRequestRef.current !== requestId) return;
      setRawLoading(false);
    }
  };

  // ───────── EFFECTS ─────────
  useEffect(() => {
    loadUsersPage();
  }, [limit, page]);

  // ───────── UI ─────────
  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Admin – Sessions & Metrics</h1>

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
                {[25, 50, 100, 200, 500].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>

            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrevUsers || usersLoading}>
              Előző
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={!canNextUsers || usersLoading}>
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
          {usersError && <p className="admin-status admin-error">{usersError}</p>}

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
                      <span className="admin-user-role">{u.role_id === 2 ? "ADMIN" : "USER"}</span>
                    </div>
                    <div className="admin-user-email">{u.email}</div>
                    <div className="admin-user-id">ID: {u.user_id}</div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <div className="admin-empty">Nincs találat</div>}
            </div>
          )}
        </section>

        {/* ───────── MIDDLE: SESSIONS ───────── */}
        <section className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">
              Sessionök {selectedUser ? `– ${selectedUser.username} (ID: ${selectedUser.user_id})` : ""}
            </h2>
            <button onClick={() => selectedUserId && loadSessionsForUser(selectedUserId)} disabled={!selectedUserId || sessionsLoading}>
              Frissítés
            </button>
          </div>

          {!selectedUserId && <p className="admin-status admin-muted">Válassz egy felhasználót bal oldalt.</p>}
          {sessionsLoading && <p className="admin-status">Betöltés…</p>}
          {sessionsError && <p className="admin-status admin-error">{sessionsError}</p>}

          {!sessionsLoading && !sessionsError && selectedUserId && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["Session ID", "Státusz", "Started", "Ended", "Device", "App ver."].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const isActive = !s.ended_at;
                    const isSelected = Number(selectedSessionId) === s.session_id;

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
          <div className="admin-card__header">
            <h2 className="admin-card__title">Session részletek</h2>
          </div>

          {!selectedSessionId && <p className="admin-status admin-muted">Kattints egy sessionre a táblázatban.</p>}

          {selectedSession && (
            <div className="admin-detail-box">
              <div><strong>Session ID:</strong> {selectedSession.session_id}</div>
              <div><strong>User ID:</strong> {selectedSession.user_id}</div>
              <div><strong>Started:</strong> {fmtDate(selectedSession.started_at)}</div>
              <div><strong>Ended:</strong> {fmtDate(selectedSession.ended_at)}</div>
              <div><strong>Device:</strong> {selectedSession.device_type ?? "-"}</div>
              <div><strong>App version:</strong> {selectedSession.app_version ?? "-"}</div>
            </div>
          )}

          {selectedSessionId && (
            <>
              <div className="admin-metrics-header">
                <h3 className="admin-metrics-title">Minták</h3>
                <button onClick={() => selectedSessionId && loadRawMetrics(selectedSessionId)} disabled={!selectedSessionId || rawLoading}>
                  Frissítés
                </button>
              </div>

              <div className="admin-metrics-meta">
                <span className="admin-pill">Session: #{selectedSessionId}</span>
              </div>

              {rawLoading && <p className="admin-status">Minták betöltése...</p>}
              {rawError && <p className="admin-status admin-error">{rawError}</p>}

              {rawMetrics && (
                <div className="admin-metrics-list">
                  {rawMetrics.map((m) => (
                    <article key={m.metrics_id} className="admin-metric-card">
                      <div className="admin-metric-row">
                        <span className="admin-metric-label">Időpont</span>
                        <span className="admin-metric-value admin-metric-value--time">{fmtDate(m.timestamp)}</span>
                      </div>
                      <div className="admin-metric-grid">
                        <div className="admin-metric-stat">
                          <span className="admin-metric-label">FPS</span>
                          <strong className="admin-metric-value">{m.fps}</strong>
                        </div>
                        <div className="admin-metric-stat">
                          <span className="admin-metric-label">Memoria (MB)</span>
                          <strong className="admin-metric-value">{m.memory_mb}</strong>
                        </div>
                        <div className="admin-metric-stat">
                          <span className="admin-metric-label">Latency (ms)</span>
                          <strong className="admin-metric-value">{m.latency_ms}</strong>
                        </div>
                        <div className="admin-metric-stat">
                          <span className="admin-metric-label">CPU/GPU</span>
                          <strong className="admin-metric-value">{m.cpu_gpu_usage}</strong>
                        </div>
                        <div className="admin-metric-stat">
                          <span className="admin-metric-label">ID</span>
                          <strong className="admin-metric-value">{m.metrics_id}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                  {rawMetrics.length === 0 && <div className="admin-empty">Nincs minta ehhez a sessionhöz.</div>}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
