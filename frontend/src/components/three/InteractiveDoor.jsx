import React, { useState, useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import "../../styles/InteractiveDoor.css";

export default function InteractiveDoor({ mesh, databaseInfo, isHovered }) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects");

  useEffect(() => {
    if (!isHovered) {
      setShowPanel(false);
      setActiveTab("subjects");
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

  // Parse structured information string into sections
  const parsedInfo = useMemo(() => {
    const raw = dbEntry?.information || "";
    if (!raw) return { header: meshName, subjects: [], teachers: [] };

    const lines = raw.split("\n");
    const header = lines[0] || meshName;
    let subjects = [];
    let teachers = [];

    lines.forEach((line) => {
      if (line.startsWith("Tárgyak: ")) {
        subjects = line.replace("Tárgyak: ", "").split(", ").filter(Boolean);
      }
      if (line.startsWith("Oktatók: ")) {
        teachers = line.replace("Oktatók: ", "").split(", ").filter(Boolean);
      }
    });

    return { header, subjects, teachers };
  }, [dbEntry, meshName]);

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
                {parsedInfo.subjects.length > 0 && (
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
                {activeTab === "subjects" && parsedInfo.subjects.length > 0 && (
                  <div className="door-info-tags">
                    {parsedInfo.subjects.map((s, i) => (
                      <span key={i} className="door-tag door-tag-subject">{s}</span>
                    ))}
                  </div>
                )}
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