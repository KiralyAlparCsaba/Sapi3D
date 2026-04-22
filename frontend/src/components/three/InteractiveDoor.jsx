import React, { useState, useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import "../../styles/InteractiveDoor.css";

export default function InteractiveDoor({ mesh, databaseInfo, isHovered }) {
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!isHovered) setShowPanel(false);
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

  const title = dbEntry?.coordinates_obj_name || "Szoba Info";
  const infoText = dbEntry?.information || "Nincs adatbázis infó ehhez az ajtóhoz.";
  const mediaUrl = dbEntry?.media_url || null;

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
            <div className="door-info-panel">
              <h3 className="door-info-title">{title}</h3>

              {/* Objektum neve a cím alatt kis betűvel */}
              <div className="door-info-name">
                {meshName}
              </div>

              {/* Media (image or video) if available */}
              {mediaUrl && (
                <div className="door-media-container">
                  {mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={mediaUrl}
                      alt={title}
                      className="door-media-image"
                    />
                  ) : mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="door-media-video"
                    />
                  ) : (
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="door-media-link"
                    >
                      View Media
                    </a>
                  )}
                </div>
              )}

              {/* Information text */}
              <p className="door-info-text">
                {infoText}
              </p>

              {/* Debug info - remove in production */}
              {!dbEntry && (
                <div className="door-debug-info">
                  ⚠️ Debug: No DB match for "{meshName}"
                </div>
              )}
            </div>
          )}

        </div>
      </Html>
    </group>
  );
}