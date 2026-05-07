import { useEffect, useState } from "react";
import api from "../../services/api";
import "../../styles/AchievementsSection.css";
import {
  BADGE_TIERS,
  buildDbAchievementDisplay,
  collectLocationIds,
} from "./achievementUtils";

// ════════════════════════════════════════
// AchievementsSection
// Önálló komponens: saját state-et és fetching-et kezel.
// Importáld a ProfilPage-be: <AchievementsSection />
// ════════════════════════════════════════

export default function AchievementsSection() {
  const [dbAchievements, setDbAchievements] = useState([]);
  const [dbAchievementsLoading, setDbAchievementsLoading] = useState(false);
  const [dbAchievementsError, setDbAchievementsError] = useState("");
  const [locationsById, setLocationsById] = useState({});

  // ── Valódi unlock szám a DB-ből ──
  // (betöltés alatt 0, utána a tényleges teljesített achievement-ek száma)
  const unlockedCount = dbAchievements.filter((a) => a.status === "unlocked").length;
  const earnedBadges = BADGE_TIERS.filter((t) => unlockedCount >= t.threshold);
  const currentBadge = earnedBadges.length ? earnedBadges[earnedBadges.length - 1] : null;
  // Következő megszerezhető badge (amelyik még nincs meg)
  const nextBadge = BADGE_TIERS.find((t) => unlockedCount < t.threshold) ?? null;

  // ── Helyszínek betöltése (location ID → name map) ──
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

  // ── DB achievementek betöltése ──
  const loadDbAchievements = async () => {
    setDbAchievementsLoading(true);
    setDbAchievementsError("");

    try {
      const res = await api.get("/achievements/user/progress");
      const payload = res.data || {};
      const unlocked = Array.isArray(payload.unlocked) ? payload.unlocked : [];
      const inProgress = Array.isArray(payload.in_progress) ? payload.in_progress : [];
      const locked = Array.isArray(payload.locked) ? payload.locked : [];

      const combined = [
        ...unlocked.map((achievement) => ({ achievement, status: "unlocked" })),
        ...inProgress.map((item) => ({ achievement: item.achievement, status: "in_progress" })),
        ...locked.map((achievement) => ({ achievement, status: "locked" })),
      ];

      let resolvedLocations = { ...locationsById };

      const detailed = await Promise.all(
        combined.map(async (item) => {
          const achvId = item.achievement?.achv_id;
          let progressPayload = null;
          let requirements = [];

          // Progress lekérés (locked achievement-nél nem értelmes)
          if (achvId && item.status !== "locked") {
            try {
              const progressRes = await api.get(`/achievements/${achvId}/progress`);
              progressPayload = progressRes.data || null;
            } catch {
              progressPayload = null;
            }
          }

          // Requirement-ek lekérése
          try {
            const reqRes = await api.get(`/achievements/${achvId}/requirements`);
            requirements = Array.isArray(reqRes.data) ? reqRes.data : [];
          } catch {
            requirements = [];
          }

          // Helyszín nevek feloldása ha szükséges
          const locationIds = collectLocationIds(requirements);
          const missingIds = locationIds.filter((id) => resolvedLocations[id] === undefined);

          if (missingIds.length) {
            const fetched = await Promise.all(
              missingIds.map(async (id) => {
                try {
                  const locRes = await api.get(`/locations/${id}`);
                  return { id, name: locRes.data?.name || `Helyszin ${id}` };
                } catch {
                  return { id, name: `Helyszin ${id}` };
                }
              }),
            );
            fetched.forEach(({ id, name }) => {
              resolvedLocations[id] = name;
            });
          }

          // Megjelenítési adatok összeállítása
          const summary = buildDbAchievementDisplay(requirements, progressPayload, resolvedLocations);
          const current = summary.current ?? progressPayload?.visited ?? (item.status === "unlocked" ? summary.target : 0);
          const target = summary.target || 1;
          const displayCurrent = summary.displayCurrent ?? current;
          const displayTarget = summary.displayTarget ?? target;
          const percentage = Math.min(100, Math.round((current / target) * 100));

          return {
            id: achvId,
            name: item.achievement?.name || "",
            description: item.achievement?.description || "",
            condition: summary.condition,
            current,
            target,
            displayCurrent,
            displayTarget,
            displayUnit: summary.displayUnit,
            category: summary.category,
            percentage,
            status: item.status,
          };
        }),
      );

      setLocationsById(resolvedLocations);
      setDbAchievements(detailed);
    } catch (e) {
      setDbAchievementsError(e?.response?.data?.detail || "A kihivasok betoltese sikertelen.");
      setDbAchievements([]);
    } finally {
      setDbAchievementsLoading(false);
    }
  };

  // ── Betöltés mountkor ──
  useEffect(() => {
    loadLocations();
    loadDbAchievements();
  }, []);

  // ── Frissítés ha a modell bezáráskor unlock történt ──
  useEffect(() => {
    const handleUpdate = () => loadDbAchievements();
    window.addEventListener("achievements-updated", handleUpdate);
    return () => window.removeEventListener("achievements-updated", handleUpdate);
  }, []);

  return (
    <section className="profil-achievements" aria-label="Kihívás lista">

      {/* ── Fejléc ── */}
      <div className="profil-achievements-head">
        <h3>Kihívások</h3>
        <span className="profil-achievements-count">
          {dbAchievementsLoading ? "..." : `${unlockedCount}/${dbAchievements.length}`}
        </span>
      </div>

      {/* ── Jelenlegi kitűző ── */}
      <div className="profil-current-badge" aria-label="Jelenlegi kitűző">
        <span className="profil-current-badge-label">Jelenlegi kitűző</span>
        {currentBadge ? (
          <div className="profil-current-badge-card">
            <span className="profil-current-badge-icon" aria-hidden="true">
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
            {dbAchievementsLoading
              ? "Betöltés..."
              : nextBadge
                ? `Teljesíts még ${nextBadge.threshold - unlockedCount} kihívást az első kitűzőért.`
                : "Még nincs kitűződ."}
          </div>
        )}
      </div>

      {/* ── Kitűzők grid ── */}
      <div className="profil-badges" aria-label="Kitűzők">
        <div className="profil-badges-head">
          <h4>Kitűzők</h4>
          <span className="profil-badges-subtitle">
            {earnedBadges.length > 0
              ? `${earnedBadges.length} / ${BADGE_TIERS.length} megszerzett`
              : "Teljesíts kihívásokat a kitűzőkért"}
          </span>
        </div>

        <div className="profil-badges-grid">
          {BADGE_TIERS.map((tier) => {
            const isUnlocked = unlockedCount >= tier.threshold;
            const remaining = tier.threshold - unlockedCount;
            return (
              <article
                key={tier.id}
                className={`profil-badge-card ${isUnlocked ? "is-unlocked" : "is-locked"}`}
              >
                <span className="profil-badge-icon" aria-hidden="true">
                  {tier.icon}
                </span>
                <div className="profil-badge-copy">
                  <strong>{tier.name}</strong>
                  <span>{tier.flavor}</span>
                  <small>
                    {isUnlocked
                      ? `${tier.threshold} kihívás — megszerzett`
                      : `Teljesíts még ${remaining} kihívást`}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {dbAchievementsError && (
        <p className="profil-error">{dbAchievementsError}</p>
      )}

      <div className="profil-achievements-grid">
        {dbAchievements.map((item) => {
          const progress = Math.min(100, item.percentage || 0);
          const isUnlocked = item.status === "unlocked";
          const isLocked = item.status === "locked";
          const statusLabel = isUnlocked
            ? "Teljesítve"
            : isLocked
              ? "Még nincs teljesítve"
              : "Folyamatban";

          return (
            <article
              key={`db-${item.id}`}
              className={`profil-achievement-card ${isUnlocked ? "is-unlocked" : "is-locked"}`}
            >
              <div className="profil-achievement-top">
                <span className="profil-achievement-category">
                  {item.category || "Egyéb"}
                </span>
                <span className="profil-achievement-state">{statusLabel}</span>
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
                {item.displayCurrent ?? item.current}/
                {item.displayTarget ?? item.target}
                {item.displayUnit ? ` ${item.displayUnit}` : ""}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
