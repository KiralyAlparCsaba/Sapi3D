import React, { useState, useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import "../../styles/InteractiveDoor.css";

export default function InteractiveDoor({ mesh, databaseInfo, isHovered }) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    if (!isHovered) {
      setShowPanel(false);
      setActiveTab(null);
    }
  }, [isHovered]);

  const worldPosition = useMemo(() => {
    if (!mesh) return new THREE.Vector3();
    mesh.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    mesh.getWorldPosition(p);
    return p;
  }, [mesh]);

  const meshName = mesh?.name || "";

  // Enhanced database lookup with debug logging
  const dbEntry = useMemo(() => {
    if (!mesh || !databaseInfo || databaseInfo.length === 0) {
      console.log("🚪 No database info available");
      return null;
    }

    console.log("🔍 Looking for door:", meshName);
    console.log("📦 Available database entries:", databaseInfo);

    // Try multiple matching strategies
    const found = databaseInfo.find((item) => {
      // Exact match on coordinates_obj_name (this is the primary field for doors!)
      if (item.coordinates_obj_name === meshName) {
        console.log("✅ Found exact match on 'coordinates_obj_name' field");
        return true;
      }

      // Case-insensitive match on coordinates_obj_name
      if (item.coordinates_obj_name?.toLowerCase() === meshName.toLowerCase()) {
        console.log("✅ Found case-insensitive match on 'coordinates_obj_name' field");
        return true;
      }

      // Partial match (contains) on coordinates_obj_name
      if (item.coordinates_obj_name?.toLowerCase().includes(meshName.toLowerCase())) {
        console.log("✅ Found partial match on 'coordinates_obj_name' field");
        return true;
      }

      // Reverse: door name contains the coordinates_obj_name
      if (meshName.toLowerCase().includes(item.coordinates_obj_name?.toLowerCase() || "")) {
        console.log("✅ Found reverse partial match (door contains coordinates_obj_name)");
        return true;
      }

      return false;
    });

    if (!found) {
      console.log("❌ No database entry found for:", meshName);
    }

    return found || null;
  }, [mesh, databaseInfo, meshName]);

  const mediaUrl = dbEntry?.media_url || null;

  // Day abbreviation map for tab labels
  const DAY_ABBR = {
    "Hétfő":    "H",
    "Kedd":     "K",
    "Szerda":   "SZ",
    "Csütörtök":"CS",
    "Péntek":   "P",
    "Szombat":  "SZO",
  };
  const DAY_ORDER = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

  // Parse information: supports JSON (new format) and legacy string format
  const parsedInfo = useMemo(() => {
    const raw = dbEntry?.information || "";
    if (!raw) return { mode: "empty", header: meshName, schedule: {}, teachers: [], subjects: [] };

    // Try JSON first (new by-day format)
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.schedule) {
        return {
          mode: "byday",
          header: obj.header || meshName,
          schedule: obj.schedule || {},
          teachers: obj.teachers || [],
          subjects: [],
        };
      }
    } catch (_) { /* not JSON, fall through */ }

    // Legacy string format
    const lines = raw.split("\n");
    const header = lines[0] || meshName;
    let subjects = [];
    let teachers = [];
    lines.forEach((line) => {
      if (line.startsWith("Tárgyak: "))
        subjects = line.replace("Tárgyak: ", "").split(", ").filter(Boolean);
      if (line.startsWith("Oktatók: "))
        teachers = line.replace("Oktatók: ", "").split(", ").filter(Boolean);
    });
    return { mode: "legacy", header, schedule: {}, teachers, subjects };
  }, [dbEntry, meshName]);

  // Set default tab when panel opens or parsedInfo changes
  const activeDays = DAY_ORDER.filter((d) => parsedInfo.schedule[d]?.length > 0);
  const defaultTab = parsedInfo.mode === "byday"
    ? (activeDays[0] || "teachers")
    : (parsedInfo.subjects.length > 0 ? "subjects" : "teachers");

  useEffect(() => {
    if (showPanel && activeTab === null) {
      setActiveTab(defaultTab);
    }
  }, [showPanel, activeTab, defaultTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "e" || e.key === "E") && isHovered) {
        setShowPanel((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHovered]);

  if (!isHovered || !mesh) return null;

  return (
    <group position={worldPosition}>
      <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
        <div className="door-panel-container">

          {!showPanel && (
            <div className="door-hint">
              {/* Objektum neve */}
              <div className="door-hint-name">
                {meshName}
              </div>
              Nyomd meg az <strong className="door-hint-key">E</strong> gombot
            </div>
          )}

          {showPanel && (
            <div
              className="door-info-panel"
              onWheel={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="door-info-title">{parsedInfo.header}</h3>

              {mediaUrl && (
                <div className="door-media-container">
                  {mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={mediaUrl} alt={parsedInfo.header} className="door-media-image" />
                  ) : mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={mediaUrl} controls className="door-media-video" />
                  ) : (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="door-media-link">
                      Média megtekintése
                    </a>
                  )}
                </div>
              )}

              {/* Tab bar */}
              <div className="door-tabs">
                {parsedInfo.mode === "byday" && activeDays.map((day) => (
                  <button
                    key={day}
                    className={`door-tab ${activeTab === day ? "door-tab-active" : ""}`}
                    onClick={() => setActiveTab(day)}
                  >
                    {DAY_ABBR[day] || day}
                    <span className="door-tab-count">{parsedInfo.schedule[day].length}</span>
                  </button>
                ))}
                {parsedInfo.mode === "legacy" && parsedInfo.subjects.length > 0 && (
                  <button
                    className={`door-tab ${activeTab === "subjects" ? "door-tab-active" : ""}`}
                    onClick={() => setActiveTab("subjects")}
                  >
                    Tárgyak
                    <span className="door-tab-count">{parsedInfo.subjects.length}</span>
                  </button>
                )}
                {parsedInfo.teachers.length > 0 && (
                  <button
                    className={`door-tab ${activeTab === "teachers" ? "door-tab-active" : ""}`}
                    onClick={() => setActiveTab("teachers")}
                  >
                    Oktatók
                    <span className="door-tab-count">{parsedInfo.teachers.length}</span>
                  </button>
                )}
              </div>

              {/* Tab content */}
              <div className="door-tab-content" onWheel={(e) => e.stopPropagation()}>
                {/* By-day mode: show schedule slots for the selected day */}
                {parsedInfo.mode === "byday" && activeTab && activeTab !== "teachers" && parsedInfo.schedule[activeTab] && (
                  <div className="door-schedule-list">
                    {parsedInfo.schedule[activeTab].map((slot, i) => (
                      <div key={i} className="door-schedule-slot">
                        <div className="door-schedule-time">
                          {slot.start}–{slot.end}
                          {slot.weeks !== "minden hét" && (
                            <span className="door-schedule-week">{slot.weeks === "Hét A (páratlan)" ? "A" : "B"}</span>
                          )}
                        </div>
                        <div className="door-schedule-subject">{slot.subject}</div>
                        {slot.teachers?.length > 0 && (
                          <div className="door-schedule-teacher">{slot.teachers.join(", ")}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Legacy mode: subject chips */}
                {parsedInfo.mode === "legacy" && activeTab === "subjects" && (
                  <div className="door-info-tags">
                    {parsedInfo.subjects.map((s, i) => (
                      <span key={i} className="door-tag door-tag-subject">{s}</span>
                    ))}
                  </div>
                )}
                {/* Teachers tab (both modes) */}
                {activeTab === "teachers" && parsedInfo.teachers.length > 0 && (
                  <div className="door-info-tags">
                    {parsedInfo.teachers.map((t, i) => (
                      <span key={i} className="door-tag door-tag-teacher">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </Html>
    </group>
  );
}