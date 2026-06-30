import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/AchievementsSection.css";
import {
  BADGE_TIERS,
  buildDbAchievementDisplay,
  collectLocationIds,
} from "./achievementUtils";

const CATEGORY_COLORS = {
  "3D":       "oklch(0.65 0.180 280)",
  "HELYSZÍN": "oklch(0.65 0.150 145)",
  "INFÓ":     "oklch(0.70 0.150  60)",
  "IDŐ":      "oklch(0.65 0.140  25)",
};

const IconMedal = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 3h10l-2 5H9z" />
    <circle cx="12" cy="14" r="6" />
    <path d="M12 11.5l1 2 2.2.3-1.6 1.5.4 2.2L12 16.5l-2 1-.4-2.2-1.6-1.5L10.2 13.5z"
      fill="currentColor" stroke="none" />
  </svg>
);

const IconTrophy = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
    <path d="M5 4h3M16 4h3M5 4v2a3 3 0 0 0 3 3M19 4v2a3 3 0 0 1-3 3" />
    <path d="M10 12h4M12 12v3M9 19h6M9 19l1-4M15 19l-1-4" />
  </svg>
);

const IconLock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12l4 4 10-10" />
  </svg>
);

export function Medal({ tier, locked, size = 56 }) {
  const cls = ["ph-medal", tier, locked ? "locked" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ width: size, height: size }}>
      {locked
        ? <IconLock />
        : tier === "gold"
          ? <IconTrophy />
          : <IconMedal />
      }
    </div>
  );
}

function ChallengeCard({ item }) {
  const status = item.status === "unlocked" ? "done" : "progress";
  const ratio  = item.target > 0 ? Math.min(1, item.current / item.target) : 0;
  const pct    = Math.round(ratio * 100);
  const catKey = (item.category || "EGYÉB").toUpperCase();
  const dotColor = CATEGORY_COLORS[catKey] || "var(--p-ink-mute)";
  const displayCurrent = item.displayCurrent ?? item.current;
  const displayTarget  = item.displayTarget  ?? item.target;
  const unit = item.displayUnit ? ` ${item.displayUnit}` : "";

  return (
    <article className={`ach-ch-card${status === "done" ? " done" : ""}`}>
      <div className="ach-ch-top">
        <span className="ach-ch-cat">
          <span
            className="ach-ch-cat-dot"
            style={{ background: dotColor }}
            aria-hidden="true"
          />
          {catKey}
        </span>
        <span className={`ach-ch-status${status === "done" ? " done" : ""}`}>
          {status === "done"
            ? <><IconCheck width="10" height="10" aria-hidden="true" /> Teljesítve</>
            : "Folyamatban"
          }
        </span>
      </div>

      <h3 className="ach-ch-name">{item.name}</h3>
      <p className="ach-ch-desc">{item.description}</p>
      <div className="ach-ch-goal">{item.condition}</div>

      <div className="ach-ch-progress-wrap">
        <div className="ach-ch-bar" aria-hidden="true">
          <div
            className="ach-ch-bar-fill"
            style={{ "--p": ratio }}
          />
        </div>
        <div className="ach-ch-progress-meta">
          <span>
            <b>{displayCurrent}{unit}</b>
            {" / "}{displayTarget}{unit}
          </span>
          <span>{pct}%</span>
        </div>
      </div>
    </article>
  );
}

export default function AchievementsSection({ onStatsChange, refreshKey = 0 }) {

  const [dbAchievements, setDbAchievements]   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [dbAchievementsError, setDbAchievementsError] = useState("");
  const [locationsById, setLocationsById]     = useState({});
  const [filter, setFilter]                   = useState("all");
  const isFirstRender = useRef(true);

  const unlockedCount = dbAchievements.filter((a) => a.status === "unlocked").length;
  const earnedBadges  = BADGE_TIERS.filter((t) => unlockedCount >= t.threshold);
  const currentBadge  = earnedBadges.length ? earnedBadges[earnedBadges.length - 1] : null;
  const nextBadge     = BADGE_TIERS.find((t) => unlockedCount < t.threshold) ?? null;

  useEffect(() => {
    const unlocked   = dbAchievements.filter((a) => a.status === "unlocked").length;
    const earned     = BADGE_TIERS.filter((t) => unlocked >= t.threshold);
    const top        = earned.length ? earned[earned.length - 1] : null;
    const tierKey    = top ? top.id.replace("badge-", "") : null;
    onStatsChange?.({
      done: unlocked,
      total: dbAchievements.length,
      currentBadge: top
        ? { name: top.name, tier: tierKey, desc: top.flavor }
        : null,
    });
  }, [dbAchievements, onStatsChange]);

  const loadLocations = async () => {
    try {
      const res = await api.get("/locations/?skip=0&limit=1000");
      const items = Array.isArray(res.data) ? res.data : [];
      const map = items.reduce((acc, loc) => {
        if (loc?.loc_id) acc[loc.loc_id] = loc.name;
        return acc;
      }, {});
      setLocationsById(map);
    } catch {
      setLocationsById({});
    }
  };

  const loadDbAchievements = async () => {
    setLoading(true);
    setDbAchievementsError("");

    try {
      const res = await api.get("/achievements/user/progress");
      const payload   = res.data || {};
      const unlocked  = Array.isArray(payload.unlocked)    ? payload.unlocked    : [];
      const inProgress = Array.isArray(payload.in_progress) ? payload.in_progress : [];
      const locked    = Array.isArray(payload.locked)      ? payload.locked      : [];

      const combined = [
        ...unlocked.map((a)    => ({ achievement: a,                status: "unlocked"    })),
        ...inProgress.map((i)  => ({ achievement: i.achievement,    status: "in_progress" })),
        ...locked.map((a)      => ({ achievement: a,                status: "locked"      })),
      ];

      let resolvedLocations = { ...locationsById };

      const detailed = await Promise.all(
        combined.map(async (item) => {
          const achvId = item.achievement?.achv_id;
          let progressPayload = null;
          let requirements    = [];

          if (achvId && item.status !== "locked") {
            try {
              const r = await api.get(`/achievements/${achvId}/progress`);
              progressPayload = r.data || null;
            } catch { progressPayload = null; }
          }

          try {
            const r = await api.get(`/achievements/${achvId}/requirements`);
            requirements = Array.isArray(r.data) ? r.data : [];
          } catch { requirements = []; }

          const locationIds  = collectLocationIds(requirements);
          const missingIds   = locationIds.filter((id) => resolvedLocations[id] === undefined);

          if (missingIds.length) {
            const fetched = await Promise.all(
              missingIds.map(async (id) => {
                try {
                  const r = await api.get(`/locations/${id}`);
                  return { id, name: r.data?.name || `Helyszin ${id}` };
                } catch {
                  return { id, name: `Helyszin ${id}` };
                }
              }),
            );
            fetched.forEach(({ id, name }) => { resolvedLocations[id] = name; });
          }

          const summary        = buildDbAchievementDisplay(requirements, progressPayload, resolvedLocations);
          const current        = summary.current ?? progressPayload?.visited ?? (item.status === "unlocked" ? summary.target : 0);
          const target         = summary.target || 1;
          const displayCurrent = summary.displayCurrent ?? current;
          const displayTarget  = summary.displayTarget  ?? target;
          const percentage     = Math.min(100, Math.round((current / target) * 100));

          return {
            id: achvId,
            name:         item.achievement?.name        || "",
            description:  item.achievement?.description || "",
            condition:    summary.condition,
            current,
            target,
            displayCurrent,
            displayTarget,
            displayUnit:  summary.displayUnit,
            category:     summary.category,
            percentage,
            status:       item.status,
          };
        }),
      );

      setLocationsById(resolvedLocations);
      setDbAchievements(detailed);
    } catch (e) {
      setDbAchievementsError(e?.response?.data?.detail || "A kihívások betöltése sikertelen.");
      setDbAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    loadDbAchievements();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    loadLocations();
    loadDbAchievements();
  }, [refreshKey]);

  useEffect(() => {
    const handler = () => loadDbAchievements();
    window.addEventListener("achievements-updated", handler);
    return () => window.removeEventListener("achievements-updated", handler);
  }, []);

  const doneCount     = dbAchievements.filter((a) => a.status === "unlocked").length;
  const progressCount = dbAchievements.length - doneCount;

  const filtered = dbAchievements.filter((a) => {
    if (filter === "done")     return a.status === "unlocked";
    if (filter === "progress") return a.status !== "unlocked";
    return true;
  });

  return (
    <>

      <section className="ach-section ach-badges-section" aria-label="Kitűzők">
        <div className="ach-section-head">
          <div>
            <h2 className="ach-section-title">Kitűzők</h2>
            <div className="ach-section-sub">Mérföldkövek az egyetem felfedezésében</div>
          </div>
          <span className="ach-count-chip" aria-label={`${earnedBadges.length} / ${BADGE_TIERS.length} kitűző megszerzve`}>
            <b>{earnedBadges.length}</b>/{BADGE_TIERS.length} megszerezve
          </span>
        </div>

        <div className="ach-badges-grid">
          {BADGE_TIERS.map((tier) => {
            const isUnlocked = unlockedCount >= tier.threshold;
            const tierKey    = tier.id.replace("badge-", "");
            const metaText   = isUnlocked
              ? `${tier.threshold} kihívás megszerezve`
              : nextBadge?.id === tier.id
                ? `Teljesíts még ${tier.threshold - unlockedCount} kihívást`
                : `${tier.threshold} kihívás szükséges`;
            return (
              <div
                key={tier.id}
                className={`ach-badge-card ${isUnlocked ? "earned" : "locked"}`}
              >
                <span className={`ach-badge-pill ${isUnlocked ? "earned" : "locked"}`}>
                  {isUnlocked ? "Megszerezve" : "Zárolva"}
                </span>
                <Medal tier={tierKey} locked={!isUnlocked} size={44} />
                <h3 className="ach-badge-name">{tier.name}</h3>
                <p className="ach-badge-desc">{tier.flavor}</p>
                <div className="ach-badge-meta">{metaText}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ach-section ach-challenges-section" aria-label="Kihívások">
        <div className="ach-section-head">
          <div>
            <h2 className="ach-section-title">Kihívások</h2>
            <div className="ach-section-sub">A felfedezésed mérföldkövei a 3D egyetemen</div>
          </div>
          <div className="ach-filter-tabs" role="group" aria-label="Szűrő">
            <button
              className={`ach-filter-tab${filter === "all"      ? " active" : ""}`}
              onClick={() => setFilter("all")}
            >
              Összes · {loading ? "…" : dbAchievements.length}
            </button>
            <button
              className={`ach-filter-tab${filter === "done"     ? " active" : ""}`}
              onClick={() => setFilter("done")}
            >
              Kész · {loading ? "…" : doneCount}
            </button>
            <button
              className={`ach-filter-tab${filter === "progress" ? " active" : ""}`}
              onClick={() => setFilter("progress")}
            >
              Folyamatban · {loading ? "…" : progressCount}
            </button>
          </div>
        </div>

        {dbAchievementsError && (
          <p className="ach-error" role="alert">{dbAchievementsError}</p>
        )}

        {loading && !dbAchievements.length && (
          <p className="ach-loading">Betöltés...</p>
        )}

        <div className="ach-challenges-grid">
          {filtered.map((item) => (
            <ChallengeCard key={`ch-${item.id}`} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}
