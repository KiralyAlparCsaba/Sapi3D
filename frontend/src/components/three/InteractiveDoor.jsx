import React, { useState, useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", pointerEvents: "none" }}>

          {!showPanel && (
            <div style={{
              background: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "6px 12px",
              borderRadius: "6px",
              fontFamily: "sans-serif",
              fontSize: "14px",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}>
              {/* Objektum neve */}
              <div style={{ fontSize: "11px", color: "#aaaaaa", marginBottom: "4px" }}>
                {meshName}
              </div>
              Nyomd meg az <strong style={{ color: "#ffcc00" }}>E</strong> gombot
            </div>
          )}

          {showPanel && (
            <div style={{
              background: "rgba(20,20,20,0.95)",
              color: "white",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #444",
              fontFamily: "sans-serif",
              width: "300px",
              maxHeight: "400px",
              overflowY: "auto",
              textAlign: "center",
              boxShadow: "0px 10px 30px rgba(0,0,0,0.5)",
            }}>
              <h3 style={{ margin: "0 0 4px 0", color: "#4da6ff" }}>{title}</h3>

              {/* Objektum neve a cím alatt kis betűvel */}
              <div style={{ fontSize: "11px", color: "#777777", marginBottom: "12px" }}>
                {meshName}
              </div>

              {/* Media (image or video) if available */}
              {mediaUrl && (
                <div style={{ marginBottom: "12px" }}>
                  {mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={mediaUrl}
                      alt={title}
                      style={{
                        width: "100%",
                        borderRadius: "4px",
                        maxHeight: "150px",
                        objectFit: "cover"
                      }}
                    />
                  ) : mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={mediaUrl}
                      controls
                      style={{
                        width: "100%",
                        borderRadius: "4px",
                        maxHeight: "150px"
                      }}
                    />
                  ) : (
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#4da6ff", fontSize: "12px" }}
                    >
                      View Media
                    </a>
                  )}
                </div>
              )}

              {/* Information text */}
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4", textAlign: "left" }}>
                {infoText}
              </p>

              {/* Debug info - remove in production */}
              {!dbEntry && (
                <div style={{
                  marginTop: "12px",
                  padding: "8px",
                  background: "rgba(255,0,0,0.1)",
                  border: "1px solid rgba(255,0,0,0.3)",
                  borderRadius: "4px",
                  fontSize: "11px",
                  color: "#ff6b6b"
                }}>
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