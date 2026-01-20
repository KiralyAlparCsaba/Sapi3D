import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
 

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function AdminPage() {
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

  // ───────── METRICS (SUMMARY + RAW) ─────────
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryInfo, setSummaryInfo] = useState(""); 
  const [summaryError, setSummaryError] = useState("");

  const [showRaw, setShowRaw] = useState(false);
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
    setSessions([]);
    setSelectedSessionId(null);
    setSummary(null);
    setSummaryInfo("");
    setSummaryError("");
    setShowRaw(false);
    setRawMetrics(null);
    setRawError("");
  };

  const loadUsersPage = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await api.get(`/users/?skip=${skip}&limit=${limit}`);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni a felhasználókat.";
      setUsersError(msg);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAllUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    setSearch("");
    setSelectedUserId(null);
    resetSessionAndMetrics();

    const all = [];
    let localSkip = 0;

    try {
      while (true) {
        const res = await api.get(`/users/?skip=${localSkip}&limit=${limit}`);
        const batch = Array.isArray(res.data) ? res.data : [];
        if (batch.length === 0) break;

        all.push(...batch);

        if (batch.length < limit) break;
        localSkip += limit;
      }
      setUsers(all);
      setPage(1);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni az összes felhasználót.";
      setUsersError(msg);
      setUsers(all);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadSessionsForUser = async (userId) => {
    if (!userId) return;
    setSessionsLoading(true);
    setSessionsError("");
    resetSessionAndMetrics();

    try {
      const res = await api.get(`/sessions/?user_id=${userId}`);
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni a sessionöket.";
      setSessionsError(msg);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSummaryForSession = async (sessionId) => {
    if (!sessionId) return;

    setSummary(null);
    setSummaryLoading(true);
    setSummaryInfo("");
    setSummaryError("");

    setShowRaw(false);
    setRawMetrics(null);
    setRawError("");

    try {
      const res = await api.get(`/sessions/${sessionId}/metrics/summary`);
      setSummary(res.data);
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;

      if (status === 404) {
        setSummaryInfo("Ehhez a sessionhöz nincs elég mérés összesítéshez (summary).");
      } else {
        setSummaryError(detail || e?.message || "Nem sikerült betölteni a metrics summary-t.");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadRawMetrics = async (sessionId) => {
    if (!sessionId) return;
    setRawLoading(true);
    setRawError("");
    setRawMetrics(null);

    try {
      const res = await api.get(`/sessions/${sessionId}/metrics`);
      setRawMetrics(Array.isArray(res.data) ? res.data : []);
      setShowRaw(true);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Nem sikerült betölteni a mintákat.";
      setRawError(msg);
      setRawMetrics([]);
      setShowRaw(true);
    } finally {
      setRawLoading(false);
    }
  };

  // ───────── EFFECTS ─────────
  useEffect(() => {
    loadUsersPage();
  }, [limit, page]);
  console.log("ADMINPAGE LOADED - NEW VERSION");

  // ───────── UI ─────────
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>Admin – Sessions & Metrics</h1>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr 420px", gap: 16 }}>
        {/* ───────── LEFT: USERS ───────── */}
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Felhasználók</h2>
            <button onClick={loadUsersPage} disabled={usersLoading}>
              Frissítés
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
            style={{ width: "100%", marginTop: 10, padding: 8 }}
            placeholder="Keresés (username / email)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {usersLoading && <p style={{ marginTop: 10 }}>Betöltés…</p>}
          {usersError && <p style={{ marginTop: 10, color: "crimson" }}>{usersError}</p>}

          {!usersLoading && !usersError && (
            <div style={{ marginTop: 10, maxHeight: 520, overflow: "auto", border: "1px solid #ddd" }}>
              {filteredUsers.map((u) => {
                const isSelected = Number(selectedUserId) === u.user_id;
                return (
                  <div
                    key={u.user_id}
                    onClick={() => {
                      setSelectedUserId(u.user_id);
                      loadSessionsForUser(u.user_id);
                    }}
                    style={{
                      padding: 10,
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      background: isSelected ? "#f3f6ff" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{u.username}</strong>
                      <span style={{ fontSize: 12, opacity: 0.75 }}>{u.role_id === 2 ? "ADMIN" : "USER"}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{u.email}</div>
                    <div style={{ fontSize: 12, opacity: 0.65 }}>ID: {u.user_id}</div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <div style={{ padding: 10, opacity: 0.7 }}>Nincs találat</div>}
            </div>
          )}
        </section>

        {/* ───────── MIDDLE: SESSIONS ───────── */}
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              Sessionök {selectedUser ? `– ${selectedUser.username} (ID: ${selectedUser.user_id})` : ""}
            </h2>
            <button onClick={() => selectedUserId && loadSessionsForUser(selectedUserId)} disabled={!selectedUserId || sessionsLoading}>
              Frissítés
            </button>
          </div>

          {!selectedUserId && <p style={{ marginTop: 10, opacity: 0.75 }}>Válassz egy felhasználót bal oldalt.</p>}
          {sessionsLoading && <p style={{ marginTop: 10 }}>Betöltés…</p>}
          {sessionsError && <p style={{ marginTop: 10, color: "crimson" }}>{sessionsError}</p>}

          {!sessionsLoading && !sessionsError && selectedUserId && (
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Session ID", "Státusz", "Started", "Ended", "Device", "App ver."].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
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
                        style={{
                          background: isSelected ? "#f3f6ff" : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setSelectedSessionId(s.session_id);
                          loadSummaryForSession(s.session_id);
                        }}
                      >
                        <td style={tdStyle}>{s.session_id}</td>
                        <td style={tdStyle}>{isActive ? "🟢 Aktív" : "⚪ Lezárt"}</td>
                        <td style={tdStyle}>{fmtDate(s.started_at)}</td>
                        <td style={tdStyle}>{fmtDate(s.ended_at)}</td>
                        <td style={tdStyle}>{s.device_type ?? "-"}</td>
                        <td style={tdStyle}>{s.app_version ?? "-"}</td>
                      </tr>
                    );
                  })}
                  {sessions.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={6}>
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
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Session részletek</h2>
            <button onClick={() => selectedSessionId && loadSummaryForSession(selectedSessionId)} disabled={!selectedSessionId || summaryLoading}>
              Summary frissítés
            </button>
          </div>

          {!selectedSessionId && <p style={{ marginTop: 10, opacity: 0.75 }}>Kattints egy sessionre a táblázatban.</p>}

          {selectedSession && (
            <div style={{ marginTop: 10, padding: 10, border: "1px solid #ddd" }}>
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
              <h3 style={{ marginTop: 16, marginBottom: 8 }}>Metrics summary</h3>

              {summaryLoading && <p>Betöltés…</p>}

              {!summaryLoading && summary && (
                <div style={{ padding: 10, border: "1px solid #ddd" }}>
                  <div style={kvRow}><span>Avg FPS</span><strong>{toFixedSafe(summary.avg_fps, 1)}</strong></div>
                  <div style={kvRow}><span>Min FPS</span><strong>{summary.min_fps}</strong></div>
                  <div style={kvRow}><span>Max FPS</span><strong>{summary.max_fps}</strong></div>
                  <hr />
                  <div style={kvRow}><span>Avg memory (MB)</span><strong>{toFixedSafe(summary.avg_memory_mb, 1)}</strong></div>
                  <div style={kvRow}><span>Avg latency (ms)</span><strong>{toFixedSafe(summary.avg_latency_ms, 1)}</strong></div>
                  <div style={kvRow}><span>Avg CPU/GPU usage</span><strong>{toFixedSafe(summary.avg_cpu_gpu_usage, 1)}</strong></div>
                  <hr />
                  <div style={kvRow}><span>Total samples</span><strong>{summary.total_samples}</strong></div>
                </div>
              )}

              {!summaryLoading && !summary && summaryInfo && (
                <div style={{ padding: 10, border: "1px solid #ddd", background: "#fff8e6" }}>
                  <strong>Info:</strong> {summaryInfo}
                </div>
              )}

              {!summaryLoading && !summary && summaryError && (
                <div style={{ padding: 10, border: "1px solid #ddd", background: "#ffecec" }}>
                  <strong>Hiba:</strong> {summaryError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => selectedSessionId && loadRawMetrics(selectedSessionId)} disabled={!selectedSessionId || rawLoading}>
                  Mutasd a mintákat
                </button>
                {showRaw && (
                  <button
                    onClick={() => {
                      setShowRaw(false);
                      setRawMetrics(null);
                      setRawError("");
                    }}
                  >
                    Elrejtés
                  </button>
                )}
              </div>

              {rawLoading && <p style={{ marginTop: 10 }}>Minták betöltése…</p>}
              {showRaw && rawError && <p style={{ marginTop: 10, color: "crimson" }}>{rawError}</p>}

              {showRaw && rawMetrics && (
                <div style={{ marginTop: 10, maxHeight: 240, overflow: "auto", border: "1px solid #ddd" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Time", "FPS", "Mem (MB)", "Latency (ms)", "CPU/GPU", "ID"].map((h) => (
                          <th key={h} style={thStyleSmall}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawMetrics.map((m) => (
                        <tr key={m.metrics_id}>
                          <td style={tdStyleSmall}>{fmtDate(m.timestamp)}</td>
                          <td style={tdStyleSmall}>{m.fps}</td>
                          <td style={tdStyleSmall}>{m.memory_mb}</td>
                          <td style={tdStyleSmall}>{m.latency_ms}</td>
                          <td style={tdStyleSmall}>{m.cpu_gpu_usage}</td>
                          <td style={tdStyleSmall}>{m.metrics_id}</td>
                        </tr>
                      ))}
                      {rawMetrics.length === 0 && (
                        <tr>
                          <td style={tdStyleSmall} colSpan={6}>Nincs minta ehhez a sessionhöz.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function toFixedSafe(v, digits = 1) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(digits);
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 12,
  background: "var(--bg-color)",
  color: "var(--text-color)",
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "8px 6px",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "8px 6px",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const thStyleSmall = {
  ...thStyle,
  fontSize: 12,
  padding: "6px 6px",
};

const tdStyleSmall = {
  ...tdStyle,
  fontSize: 12,
  padding: "6px 6px",
};

const kvRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "4px 0",
};
