import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";

export default function AchievementsAdminPanel() {
  const achievementsRequestRef = useRef(0);
  const requirementsRequestRef = useRef(0);
  const locationsRequestRef = useRef(0);
  const panelsRequestRef = useRef(0);

  // ───────── ACHIEVEMENTS ─────────
  const [achievements, setAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [achievementsError, setAchievementsError] = useState("");
  const [selectedAchievementId, setSelectedAchievementId] = useState(null);

  // ───────── LOCATIONS & PANELS ─────────
  const [locations, setLocations] = useState([]);
  const [panels, setPanels] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [panelsLoading, setPanelsLoading] = useState(false);

  // ───────── NEW ACHIEVEMENT FORM ─────────
  const [newAchievementForm, setNewAchievementForm] = useState({
    name: "",
    description: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // ───────── REQUIREMENTS ─────────
  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState("");

  // ───────── NEW REQUIREMENT FORM ─────────
  const [newRequirementForm, setNewRequirementForm] = useState({
    req_type: "model_view_count",
    value: "",
    locationIds: [],
    panelIds: [],
  });
  const [requirementLoading, setRequirementLoading] = useState(false);
  const [requirementError, setRequirementError] = useState("");
  const [requirementSuccess, setRequirementSuccess] = useState("");

  // ───────── LOADERS ─────────
  const loadLocations = async () => {
    const requestId = ++locationsRequestRef.current;
    setLocationsLoading(true);

    try {
      const res = await api.get("/locations/?skip=0&limit=1000");
      if (locationsRequestRef.current !== requestId) return;
      setLocations(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (locationsRequestRef.current !== requestId) return;
      setLocations([]);
    } finally {
      if (locationsRequestRef.current !== requestId) return;
      setLocationsLoading(false);
    }
  };

  const loadPanels = async () => {
    const requestId = ++panelsRequestRef.current;
    setPanelsLoading(true);

    try {
      const res = await api.get("/info-panels/?skip=0&limit=1000");
      if (panelsRequestRef.current !== requestId) return;
      setPanels(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (panelsRequestRef.current !== requestId) return;
      setPanels([]);
    } finally {
      if (panelsRequestRef.current !== requestId) return;
      setPanelsLoading(false);
    }
  };

  const loadAchievements = async () => {
    const requestId = ++achievementsRequestRef.current;
    setAchievementsLoading(true);
    setAchievementsError("");
    setSelectedAchievementId(null);
    setRequirements([]);
    requirementsRequestRef.current += 1;

    try {
      const res = await api.get("/achievements");
      if (achievementsRequestRef.current !== requestId) return;
      setAchievements(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (achievementsRequestRef.current !== requestId) return;
      setAchievementsError(e?.response?.data?.detail || "Sikertelen betöltés.");
      setAchievements([]);
    } finally {
      if (achievementsRequestRef.current !== requestId) return;
      setAchievementsLoading(false);
    }
  };

  const loadRequirementsForAchievement = async (achvId) => {
    if (!achvId) return;
    const requestId = ++requirementsRequestRef.current;
    setRequirementsLoading(true);
    setRequirementsError("");
    setRequirementSuccess("");

    try {
      const res = await api.get(`/achievements/${achvId}/requirements`);
      if (requirementsRequestRef.current !== requestId) return;
      setRequirements(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (requirementsRequestRef.current !== requestId) return;
      setRequirementsError(e?.response?.data?.detail || "Sikertelen betöltés.");
      setRequirements([]);
    } finally {
      if (requirementsRequestRef.current !== requestId) return;
      setRequirementsLoading(false);
    }
  };

  // ───────── ACTIONS ─────────
  const createAchievement = async () => {
    const name = newAchievementForm.name.trim();
    const description = newAchievementForm.description.trim();

    if (!name) {
      setCreateError("Az achievement neve nem lehet üres.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const payload = { name, description };
      const res = await api.post("/achievements", payload);

      const newAchv = res.data?.achievement || res.data;
      setAchievements((prev) => [...prev, newAchv]);

      setNewAchievementForm({ name: "", description: "" });
      setCreateSuccess("Achievement sikeresen létrehozva.");

      setTimeout(() => setCreateSuccess(""), 3000);
    } catch (e) {
      setCreateError(e?.response?.data?.detail || "Sikertelen létrehozás.");
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteAchievement = async (achvId) => {
    const ok = window.confirm(
      `Biztosan törlöd ezt az achievement-et? (ID: ${achvId})`,
    );
    if (!ok) return;

    setAchievementsLoading(true);
    setAchievementsError("");

    try {
      await api.delete(`/achievements/${achvId}`);

      setAchievements((prev) => prev.filter((a) => a.achv_id !== achvId));

      if (selectedAchievementId === achvId) {
        setSelectedAchievementId(null);
        setRequirements([]);
      }

      setAchievementsError("");
    } catch (e) {
      setAchievementsError(e?.response?.data?.detail || "Sikertelen törlés.");
    } finally {
      setAchievementsLoading(false);
    }
  };

  const addRequirement = async () => {
    if (!selectedAchievementId) {
      setRequirementError("Válassz egy achievement-et.");
      return;
    }

    const reqType = newRequirementForm.req_type;
    const isNumeric = [
      "model_view_count",
      "location_count",
      "panel_count",
      "time_spent",
    ].includes(reqType);
    const isLocation = reqType === "location";
    const isPanel = reqType === "panel";

    let params = new URLSearchParams();
    params.append("req_type", reqType);

    if (isNumeric) {
      const value = Number(newRequirementForm.value);
      if (!newRequirementForm.value || isNaN(value) || value < 0) {
        setRequirementError("Az érték egy pozitív szám kell hogy legyen.");
        return;
      }
      params.append("value", value);
    } else if (isLocation) {
      const ids = newRequirementForm.locationIds;
      if (ids.length === 0) {
        setRequirementError("Legalább egy location szükséges.");
        return;
      }
      ids.forEach((id) => params.append("location_ids", id));
    } else if (isPanel) {
      const ids = newRequirementForm.panelIds;
      if (ids.length === 0) {
        setRequirementError("Legalább egy panel szükséges.");
        return;
      }
      ids.forEach((id) => params.append("panel_ids", id));
    }

    setRequirementLoading(true);
    setRequirementError("");
    setRequirementSuccess("");

    try {
      const res = await api.post(
        `/achievements/${selectedAchievementId}/requirements?${params.toString()}`,
      );

      const newReq = res.data?.requirement || res.data;
      setRequirements((prev) => [...prev, newReq]);

      setNewRequirementForm({
        req_type: "model_view_count",
        value: "",
        locationIds: [],
        panelIds: [],
      });

      setRequirementSuccess("Requirement sikeresen hozzáadva.");
      setTimeout(() => setRequirementSuccess(""), 3000);
    } catch (e) {
      setRequirementError(e?.response?.data?.detail || "Sikertelen hozzáadás.");
    } finally {
      setRequirementLoading(false);
    }
  };

  const deleteAllRequirements = async (achvId) => {
    const ok = window.confirm(
      "Biztosan törlöd az összes requirement-et ehhez az achievement-hez?",
    );
    if (!ok) return;

    setRequirementsLoading(true);
    setRequirementsError("");

    try {
      await api.delete(`/achievements/${achvId}/requirements`);
      setRequirements([]);
      setRequirementSuccess("Összes requirement törölve.");
      setTimeout(() => setRequirementSuccess(""), 3000);
    } catch (e) {
      setRequirementsError(e?.response?.data?.detail || "Sikertelen törlés.");
    } finally {
      setRequirementsLoading(false);
    }
  };

  // ───────── DERIVED ─────────
  const selectedAchievement = useMemo(
    () => achievements.find((a) => a.achv_id === selectedAchievementId) ?? null,
    [achievements, selectedAchievementId],
  );

  // ───────── EFFECTS ─────────
  useEffect(() => {
    loadAchievements();
    loadLocations();
    loadPanels();
  }, []);

  // ───────── UI ─────────
  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">Achievements</h2>
        <button onClick={loadAchievements} disabled={achievementsLoading}>
          Frissítés
        </button>
      </div>

      {achievementsLoading && <p className="admin-status">Betöltés…</p>}
      {achievementsError && (
        <p className="admin-status admin-error">{achievementsError}</p>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        {/* ───────── LEFT: CREATE NEW ACHIEVEMENT ───────── */}
        <section
          style={{ borderRight: "1px solid #e0e0e0", paddingRight: "1rem" }}
        >
          <h3 className="admin-metrics-title">Új Achievement</h3>

          <label className="admin-field">
            Név
            <input
              value={newAchievementForm.name}
              onChange={(e) =>
                setNewAchievementForm((p) => ({ ...p, name: e.target.value }))
              }
              disabled={createLoading}
              placeholder="pl. Első lépések"
            />
          </label>

          <label className="admin-field">
            Leírás
            <textarea
              value={newAchievementForm.description}
              onChange={(e) =>
                setNewAchievementForm((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              disabled={createLoading}
              placeholder="pl. Végigmegyél az első modellen"
              rows={3}
              style={{ resize: "vertical" }}
            />
          </label>

          {createError && (
            <p className="admin-status admin-error">{createError}</p>
          )}
          {createSuccess && <p className="admin-status">{createSuccess}</p>}

          <button
            onClick={createAchievement}
            disabled={createLoading}
            style={{ width: "100%" }}
          >
            {createLoading ? "Létrehozás…" : "Achievement létrehozása"}
          </button>
        </section>

        {/* ───────── RIGHT: ACHIEVEMENTS LIST ───────── */}
        <section>
          <h3 className="admin-metrics-title">
            Achievements ({achievements.length})
          </h3>

          {!achievementsLoading && !achievementsError && (
            <div className="admin-list">
              {achievements.map((a) => {
                const isSelected = selectedAchievementId === a.achv_id;
                return (
                  <div
                    key={a.achv_id}
                    onClick={() => {
                      setSelectedAchievementId(a.achv_id);
                      loadRequirementsForAchievement(a.achv_id);
                    }}
                    className={`admin-user-item${isSelected ? " is-selected" : ""}`}
                  >
                    <div className="admin-user-head">
                      <strong>{a.name}</strong>
                    </div>
                    <div className="admin-user-email">{a.description}</div>
                    <div className="admin-user-id">ID: {a.achv_id}</div>
                  </div>
                );
              })}
              {achievements.length === 0 && (
                <div className="admin-empty">Nincs achievement</div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ───────── REQUIREMENTS SECTION ───────── */}
      {selectedAchievement && (
        <section
          style={{
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 className="admin-metrics-title">
              Requirements – {selectedAchievement.name}
            </h3>
            <button
              onClick={() => deleteAchievement(selectedAchievementId)}
              style={{
                background: "#ff4444",
                color: "white",
                padding: "0.5rem 1rem",
              }}
              disabled={achievementsLoading}
            >
              Achievement törlése
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* ───────── ADD REQUIREMENT ───────── */}
            <section
              style={{ borderRight: "1px solid #e0e0e0", paddingRight: "1rem" }}
            >
              <h4
                style={{
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                Új Requirement
              </h4>

              <label className="admin-field">
                Típus
                <select
                  value={newRequirementForm.req_type}
                  onChange={(e) =>
                    setNewRequirementForm((p) => ({
                      ...p,
                      req_type: e.target.value,
                    }))
                  }
                  disabled={requirementLoading}
                >
                  <option value="model_view_count">
                    Model megtekintések száma
                  </option>
                  <option value="location_count">
                    Bármelyik N helyszín meglátogatása
                  </option>
                  <option value="panel_count">
                    Bármelyik N panel megtekintése
                  </option>
                  <option value="time_spent">Időtöltés (másodperc)</option>
                  <option value="location">
                    Specifikus helyszínek meglátogatása
                  </option>
                  <option value="panel">Specifikus panelok megtekintése</option>
                </select>
              </label>

              {[
                "model_view_count",
                "location_count",
                "panel_count",
                "time_spent",
              ].includes(newRequirementForm.req_type) && (
                <label className="admin-field">
                  {newRequirementForm.req_type === "model_view_count" &&
                    "Megtekintések száma"}
                  {newRequirementForm.req_type === "location_count" &&
                    "Helyszínek száma"}
                  {newRequirementForm.req_type === "panel_count" &&
                    "Panelok száma"}
                  {newRequirementForm.req_type === "time_spent" && "Idő (mp)"}
                  <input
                    type="number"
                    min="0"
                    value={newRequirementForm.value}
                    onChange={(e) =>
                      setNewRequirementForm((p) => ({
                        ...p,
                        value: e.target.value,
                      }))
                    }
                    disabled={requirementLoading}
                    placeholder="0"
                  />
                </label>
              )}

              {newRequirementForm.req_type === "location" && (
                <fieldset className="admin-field">
                  <legend
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    Szükséges helyszínek
                  </legend>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "0.5rem",
                    }}
                  >
                    {locationsLoading ? (
                      <span style={{ fontSize: "0.9rem", color: "#666" }}>
                        Betöltés…
                      </span>
                    ) : locations.length === 0 ? (
                      <span style={{ fontSize: "0.9rem", color: "#999" }}>
                        Nincsenek helyszínek
                      </span>
                    ) : (
                      locations.map((loc) => (
                        <label
                          key={loc.loc_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={newRequirementForm.locationIds.includes(
                              loc.loc_id,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRequirementForm((p) => ({
                                  ...p,
                                  locationIds: [...p.locationIds, loc.loc_id],
                                }));
                              } else {
                                setNewRequirementForm((p) => ({
                                  ...p,
                                  locationIds: p.locationIds.filter(
                                    (id) => id !== loc.loc_id,
                                  ),
                                }));
                              }
                            }}
                            disabled={requirementLoading}
                          />
                          {loc.name}
                        </label>
                      ))
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.85rem",
                      color: "#666",
                    }}
                  >
                    Kiválasztva: {newRequirementForm.locationIds.length} db
                  </div>
                </fieldset>
              )}

              {newRequirementForm.req_type === "panel" && (
                <fieldset className="admin-field">
                  <legend
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    Szükséges panelok
                  </legend>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "0.5rem",
                    }}
                  >
                    {panelsLoading ? (
                      <span style={{ fontSize: "0.9rem", color: "#666" }}>
                        Betöltés…
                      </span>
                    ) : panels.length === 0 ? (
                      <span style={{ fontSize: "0.9rem", color: "#999" }}>
                        Nincsenek panelok
                      </span>
                    ) : (
                      panels.map((panel) => (
                        <label
                          key={panel.panel_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={newRequirementForm.panelIds.includes(
                              panel.panel_id,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRequirementForm((p) => ({
                                  ...p,
                                  panelIds: [...p.panelIds, panel.panel_id],
                                }));
                              } else {
                                setNewRequirementForm((p) => ({
                                  ...p,
                                  panelIds: p.panelIds.filter(
                                    (id) => id !== panel.panel_id,
                                  ),
                                }));
                              }
                            }}
                            disabled={requirementLoading}
                          />
                          {panel.name}
                        </label>
                      ))
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.85rem",
                      color: "#666",
                    }}
                  >
                    Kiválasztva: {newRequirementForm.panelIds.length} db
                  </div>
                </fieldset>
              )}

              {requirementError && (
                <p className="admin-status admin-error">{requirementError}</p>
              )}
              {requirementSuccess && (
                <p className="admin-status">{requirementSuccess}</p>
              )}

              <button
                onClick={addRequirement}
                disabled={requirementLoading || !selectedAchievementId}
                style={{ width: "100%" }}
              >
                {requirementLoading ? "Hozzáadás…" : "Requirement hozzáadása"}
              </button>
            </section>

            {/* ───────── REQUIREMENTS LIST ───────── */}
            <section>
              <h4
                style={{
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                Jelenlegi Requirements ({requirements.length})
              </h4>

              {requirementsLoading && <p className="admin-status">Betöltés…</p>}
              {requirementsError && (
                <p className="admin-status admin-error">{requirementsError}</p>
              )}

              {!requirementsLoading && !requirementsError && (
                <div
                  className="admin-list"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  {requirements.map((req, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        marginBottom: "0.5rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div>
                        <strong>{req.req_type}</strong>
                      </div>
                      {req.value !== null && <div>Érték: {req.value}</div>}
                      {req.location_id && (
                        <div>Location ID: {req.location_id}</div>
                      )}
                      {req.panel_id && <div>Panel ID: {req.panel_id}</div>}
                    </div>
                  ))}
                  {requirements.length === 0 && (
                    <div className="admin-empty">Nincs requirement</div>
                  )}
                </div>
              )}

              {requirements.length > 0 && (
                <button
                  onClick={() => deleteAllRequirements(selectedAchievementId)}
                  style={{
                    width: "100%",
                    marginTop: "0.5rem",
                    background: "#ff6666",
                    color: "white",
                  }}
                  disabled={requirementsLoading}
                >
                  {requirementsLoading
                    ? "Törlés…"
                    : "Összes requirement törlése"}
                </button>
              )}
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
