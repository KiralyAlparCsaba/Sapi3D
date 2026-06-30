import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "../../services/api";
import "../../styles/AdminDashboard.css";

const C = {
  green:  "#3fb950",
  blue:   "#58a6ff",
  orange: "#f0883e",
  purple: "#bc8cff",
  red:    "#ff7b72",
  yellow: "#e3b341",
};

const DEVICE_COLORS = [C.blue, C.green, C.orange, C.purple, C.yellow, C.red];
const MODE_COLORS   = { single: C.blue, multi: C.green, unknown: "#555" };

const POLL_INTERVAL = 30;

function fmtTime(isoString) {
  if (!isoString) return "–";

  const utc = isoString.endsWith("Z") || isoString.includes("+") ? isoString : isoString + "Z";
  return new Date(utc).toLocaleTimeString("hu-HU", {
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtAgo(isoString) {
  if (!isoString) return "–";
  const utc = isoString.endsWith("Z") || isoString.includes("+") ? isoString : isoString + "Z";
  const diff = Math.floor((Date.now() - new Date(utc).getTime()) / 1000);
  if (diff < 60)   return `${diff} mp`;
  if (diff < 3600) return `${Math.floor(diff / 60)} perce`;
  return `${Math.floor(diff / 3600)} órája`;
}

function fpsClass(fps) {
  if (fps == null) return "";
  if (fps >= 50) return "fps-good";
  if (fps >= 30) return "fps-ok";
  return "fps-bad";
}

function ChartTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;

  const allNull = payload.every((p) => p.value == null);

  return (
    <div style={{
      background: "var(--bg, #fff)",
      border: "1px solid #cfe2d3",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: "var(--text-color, #1f2d21)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }}>
      <div style={{ marginBottom: 4, opacity: 0.7, fontSize: 11 }}>{label}</div>
      {allNull ? (
        <div style={{ opacity: 0.55, fontStyle: "italic" }}>
          Nincs adat — ebben az órában nem volt aktív felhasználó
        </div>
      ) : (
        payload.map((p) => (
          <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {p.value != null ? `${p.value.toFixed(1)}${unit}` : "–"}
          </div>
        ))
      )}
    </div>
  );
}

const DEVICE_LABELS = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", unknown: "Egyéb" };
const DEVICE_ICONS  = { desktop: "🖥", mobile: "📱", tablet: "📲" };

const PERF_METRICS = [
  { key: "avg_fps",        label: "FPS",     unit: "fps", color: "#3fb950", lowerIsBetter: false },
  { key: "avg_memory_mb",  label: "Memória", unit: "MB",  color: "#bc8cff", lowerIsBetter: true  },
  { key: "avg_latency_ms", label: "Latency", unit: "ms",  color: "#f0883e", lowerIsBetter: true  },
];
const PERF_COLS = [
  { key: "overall", label: "Átlag"        },
  { key: "single",  label: "Singleplayer" },
  { key: "multi",   label: "Multiplayer"  },
];

function DeviceModeTable({ rows }) {
  if (!rows || rows.length === 0) return null;

  const byDevice = {};
  rows.forEach((r) => {
    if (!byDevice[r.device_type]) byDevice[r.device_type] = {};
    byDevice[r.device_type][r.play_mode ?? "overall"] = r;
  });

  const devices = Object.keys(byDevice).filter(d => d !== "unknown");
  if (devices.length === 0) return null;

  return (
    <div className="dash-perf-grid">
      {devices.map((device) => {
        const data   = byDevice[device];
        const cols   = PERF_COLS.filter(c => data[c.key]);
        const overall = data["overall"];

        return (
          <div key={device} className="dash-perf-card">

            <div className="dash-perf-device-header">
              <span className="dash-perf-device-icon">{DEVICE_ICONS[device] ?? "💻"}</span>
              <span className="dash-perf-device-name">{DEVICE_LABELS[device] ?? device}</span>
              <span className="dash-perf-period">elmúlt 24 óra</span>
            </div>

            <table className="dash-perf-table">
              <thead>
                <tr>
                  <th className="dash-perf-th-empty" />
                  {cols.map(c => (
                    <th key={c.key} className={`dash-perf-th${c.key === "overall" ? " dash-perf-th--overall" : ""}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERF_METRICS.map((metric) => (
                  <tr key={metric.key}>
                    <td className="dash-perf-row-label" style={{ color: metric.color }}>
                      {metric.label}
                    </td>
                    {cols.map((col) => {
                      const val    = data[col.key]?.[metric.key];
                      const refVal = overall?.[metric.key];

                      let badge = null;
                      if (col.key !== "overall" && val != null && refVal != null) {
                        const pct = ((val - refVal) / refVal) * 100;
                        if (Math.abs(pct) >= 5) {
                          const isBetter = metric.lowerIsBetter ? pct < 0 : pct > 0;
                          badge = (
                            <span className={`dash-perf-badge ${isBetter ? "badge-better" : "badge-worse"}`}>
                              {isBetter ? "▲" : "▼"} {Math.abs(Math.round(pct))}%
                            </span>
                          );
                        }
                      }

                      return (
                        <td key={col.key}
                            className={`dash-perf-val${col.key === "overall" ? " dash-perf-val--overall" : ""}`}
                            style={{ color: metric.color }}>
                          {val != null ? `${Math.round(val)} ${metric.unit}` : "–"}
                          {badge}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, unit, sub, subType, accent }) {
  return (
    <div className={`dash-stat-card accent-${accent}`}>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value">
        {value ?? "–"}
        {unit && <span className="dash-stat-unit"> {unit}</span>}
      </div>
      {sub && (
        <div className={`dash-stat-sub${subType ? ` ${subType}` : ""}`}>{sub}</div>
      )}
    </div>
  );
}

export default function DashboardTab() {
  const [overview, setOverview]         = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [history, setHistory]           = useState([]);
  const [engagement, setEngagement]     = useState(null);
  const [deviceMetrics, setDeviceMetrics] = useState([]);

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const [lastUpdate, setLastUpdate] = useState(null);

  const countdownRef = useRef(POLL_INTERVAL);

  const fetchAll = useCallback(async () => {
    setError("");
    try {
      const [ovRes, activeRes, histRes, engRes, devRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/sessions/active"),
        api.get("/admin/metrics/history?hours=24"),
        api.get("/admin/engagement"),
        api.get("/admin/device-metrics?hours=24"),
      ]);

      setOverview(ovRes.data);
      setActiveSessions(Array.isArray(activeRes.data) ? activeRes.data : []);
      setHistory(Array.isArray(histRes.data) ? histRes.data : []);
      setEngagement(engRes.data);
      setDeviceMetrics(Array.isArray(devRes.data) ? devRes.data : []);
      setLastUpdate(new Date());
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
        "Nem sikerült betölteni a dashboard adatokat."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const poll = setInterval(() => {
      fetchAll();
      countdownRef.current = POLL_INTERVAL;
      setCountdown(POLL_INTERVAL);
    }, POLL_INTERVAL * 1000);

    const tick = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown(countdownRef.current);
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [fetchAll]);

  const chartHistory = useMemo(() => {
    const raw = history.map((p) => ({
      t:   fmtTime(p.timestamp),
      fps: p.avg_fps        != null ? Math.round(p.avg_fps)        : null,
      mem: p.avg_memory_mb  != null ? Math.round(p.avg_memory_mb)  : null,
      lat: p.avg_latency_ms != null ? Math.round(p.avg_latency_ms) : null,
    }));

    const hasData = (p) => p.fps != null || p.mem != null;

    let start = raw.findIndex(hasData);
    if (start === -1) return [];

    let end = raw.length - 1;
    while (end > start && !hasData(raw[end])) end--;

    return raw.slice(start, end + 1);
  }, [history]);

  const deviceData = (engagement?.device_breakdown ?? []).map((d) => ({
    name: d.device_type,
    value: d.count,
  }));
  const deviceTotal = deviceData.reduce((s, d) => s + d.value, 0);

  const MODE_LABELS = { single: "Singleplayer", multi: "Multiplayer" };
  const modeData = (engagement?.mode_breakdown ?? []).map((m) => ({
    name: m.mode,
    label: MODE_LABELS[m.mode] ?? m.mode,
    value: m.count,
    color: MODE_COLORS[m.mode] ?? "#888",
  }));
  const modeTotal = modeData.reduce((s, m) => s + m.value, 0);

  const durationData = (engagement?.duration_buckets ?? []).map((b) => ({
    name: b.label,
    count: b.count,
  }));

  if (loading) {
    return <div className="dash-loading">Dashboard adatok betöltése…</div>;
  }

  if (error) {
    return (
      <div className="dash" style={{ padding: 20 }}>
        <div className="dash-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="dash">

      <div className="dash-refresh-row">
        <span className="dash-live-badge">LIVE</span>
        Utolsó frissítés: {lastUpdate?.toLocaleTimeString("hu-HU")} &nbsp;·&nbsp;
        Következő: <span className="dash-refresh-countdown">&nbsp;{countdown}s</span>
      </div>

      <div>
        <div className="dash-section-title">Áttekintés — most</div>
        <div className="dash-stat-grid dash-stat-grid--small">
          <StatCard
            label="Online felhasználók"
            value={overview?.online_users ?? 0}
            sub={`${overview?.active_sessions ?? 0} aktív session`}
            accent="green"
          />
          <StatCard
            label="Mai session-ök"
            value={overview?.total_sessions_today ?? 0}
            sub="ma indított session-ök száma"
            accent="blue"
          />
          <StatCard
            label="Átlag session hossz"
            value={overview?.avg_session_duration_minutes != null
              ? Math.round(overview.avg_session_duration_minutes) : "–"}
            unit="perc"
            sub="lezárt session-ök átlaga"
            accent="orange"
          />
          <StatCard
            label="Vendég belépések"
            value={overview?.guest_logins_today ?? 0}
            sub={`ezen a héten: ${overview?.guest_logins_week ?? 0}`}
            accent="purple"
          />
        </div>
      </div>

      <div>
        <div className="dash-section-title">Eloszlás</div>
        <div className="dash-distrib-grid">

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <div className="dash-chart-title">Session hossz</div>
                <div className="dash-chart-subtitle">Percben · lezárt session-ök</div>
              </div>
            </div>
            {durationData.every(d => d.count === 0) ? (
              <div className="dash-loading" style={{ padding: "30px 0" }}>Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={durationData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} session`, "Darab"]} />
                  <Bar dataKey="count" name="Session-ök" fill={C.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <div className="dash-chart-title">Eszköz megoszlás</div>
                <div className="dash-chart-subtitle">Összes session alapján</div>
              </div>
            </div>
            {deviceData.length === 0 ? (
              <div className="dash-loading" style={{ padding: "30px 0" }}>Nincs adat</div>
            ) : (
              <div className="dash-donut-wrap">
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                      {deviceData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} session`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dash-donut-legend">
                  {deviceData.map((d, i) => {
                    const pct   = deviceTotal > 0 ? Math.round((d.value / deviceTotal) * 100) : 0;
                    const color = DEVICE_COLORS[i % DEVICE_COLORS.length];
                    return (
                      <div key={d.name} className="dash-donut-row">
                        <div className="dash-donut-row-label">
                          <div className="dash-legend-dot" style={{ background: color }} />{d.name}
                        </div>
                        <div className="dash-donut-bar-bg">
                          <div className="dash-donut-bar" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="dash-donut-pct">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <div className="dash-chart-title">Játékmód megoszlás</div>
                <div className="dash-chart-subtitle">30 mp-es metrika időszakok alapján</div>
              </div>
            </div>
            {modeData.length === 0 ? (
              <div className="dash-loading" style={{ padding: "30px 0" }}>Nincs adat</div>
            ) : (
              <div className="dash-donut-wrap">
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={modeData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                      {modeData.map((m) => <Cell key={m.name} fill={m.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} időszak`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dash-donut-legend">
                  {modeData.map((m) => {
                    const pct = modeTotal > 0 ? Math.round((m.value / modeTotal) * 100) : 0;
                    return (
                      <div key={m.name} className="dash-donut-row">
                        <div className="dash-donut-row-label">
                          <div className="dash-legend-dot" style={{ background: m.color }} />{m.label}
                        </div>
                        <div className="dash-donut-bar-bg">
                          <div className="dash-donut-bar" style={{ width: `${pct}%`, background: m.color }} />
                        </div>
                        <div className="dash-donut-pct">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="dash-section-title">Teljesítmény — eszköz és mód szerint · elmúlt 24 óra</div>
        <DeviceModeTable rows={deviceMetrics} />
      </div>

      <div>
        <div className="dash-section-title">Trendek — elmúlt 24 óra</div>
        <div className="dash-section-subtitle">Az egyenes szakaszok olyan időszakokat jelölnek ahol nem volt aktív felhasználó</div>
        <div className="dash-trends-grid">

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <div className="dash-chart-title">FPS trend</div>
                <div className="dash-chart-subtitle">Óránkénti átlag, összes session</div>
              </div>
              <div className="dash-legend">
                <div className="dash-legend-item">
                  <div className="dash-legend-dot" style={{ background: C.green }} />FPS
                </div>
              </div>
            </div>
            {chartHistory.length === 0 ? (
              <div className="dash-loading" style={{ padding: "30px 0" }}>Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartHistory} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit=" fps" />
                  <Tooltip content={<ChartTooltip unit=" fps" />} />
                  <Area type="monotone" dataKey="fps" name="FPS" stroke={C.green} strokeWidth={2}
                        fill="url(#fpsGrad)" dot={{ r: 3, fill: C.green }} activeDot={{ r: 5 }}
                        connectNulls={true} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <div className="dash-chart-title">Memóriahasználat</div>
                <div className="dash-chart-subtitle">Óránkénti átlag MB</div>
              </div>
              <div className="dash-legend">
                <div className="dash-legend-item">
                  <div className="dash-legend-dot" style={{ background: C.purple }} />Memória
                </div>
              </div>
            </div>
            {chartHistory.length === 0 ? (
              <div className="dash-loading" style={{ padding: "30px 0" }}>Nincs adat</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartHistory} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.purple} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.purple} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit=" MB" />
                  <Tooltip content={<ChartTooltip unit=" MB" />} />
                  <Area type="monotone" dataKey="mem" name="Memória" stroke={C.purple} strokeWidth={2}
                        fill="url(#memGrad)" dot={{ r: 3, fill: C.purple }} connectNulls={true} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="dash-live-feed-header">
          <div className="dash-section-title">
            Élő session feed
            <span className="dash-live-online-count">
              <span className="dash-live-online-num">{activeSessions.length}</span> felhasználó online
            </span>
          </div>
          <span className="dash-live-badge">LIVE</span>
        </div>
        {activeSessions.length === 0 ? (
          <div className="dash-chart-card">
            <div className="dash-loading" style={{ padding: "20px 0" }}>Nincs aktív session</div>
          </div>
        ) : (
          <div className="dash-live-table-wrap">
            <table className="dash-live-table">
              <thead>
                <tr>
                  <th>Felhasználó</th>
                  <th>Eszköz</th>
                  <th>Belépett</th>
                  <th style={{ color: "#3fb950" }}>FPS</th>
                  <th style={{ color: "#bc8cff" }}>Memória</th>
                  <th style={{ color: "#f0883e" }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.session_id}>
                    <td><span className="dash-status-live">{s.username}</span></td>
                    <td><span className="dash-device-badge">{s.device_type ?? "–"}</span></td>
                    <td className="dash-live-time-cell">{fmtAgo(s.started_at)}</td>
                    <td>
                      {s.latest_fps != null
                        ? <strong className={fpsClass(s.latest_fps)}>{s.latest_fps}</strong>
                        : <span className="dash-live-no-data">–</span>}
                    </td>
                    <td>
                      {s.latest_memory_mb != null
                        ? <strong style={{ color: "#bc8cff" }}>{s.latest_memory_mb} MB</strong>
                        : <span className="dash-live-no-data">–</span>}
                    </td>
                    <td>
                      {s.latest_latency_ms != null
                        ? <strong style={{ color: "#f0883e" }}>{s.latest_latency_ms} ms</strong>
                        : <span className="dash-live-no-data">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
