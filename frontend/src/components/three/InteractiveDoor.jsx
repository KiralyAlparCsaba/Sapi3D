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

  const dbEntry = databaseInfo?.find(
    (item) => item.name === mesh?.name || item.button_location === mesh?.name
  );
  const title = dbEntry?.name || "Szoba Info";
  const infoText = dbEntry?.information || "Nincs adatbázis infó ehhez az ajtóhoz.";
  const meshName = mesh?.name || "";

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
              width: "260px",
              textAlign: "center",
              boxShadow: "0px 10px 30px rgba(0,0,0,0.5)",
            }}>
              <h3 style={{ margin: "0 0 4px 0", color: "#4da6ff" }}>{title}</h3>
              {/* Objektum neve a cím alatt kis betűvel */}
              <div style={{ fontSize: "11px", color: "#777777", marginBottom: "12px" }}>
                {meshName}
              </div>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>{infoText}</p>
            </div>
          )}

        </div>
      </Html>
    </group>
  );
}