import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function LocationsPage() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Your location cards (edit markers later from the list below) ---
  const locations = useMemo(
    () => [
      { name: "Dékáni hivatal", room: "232-es terem", marker: "Marker001" },
      { name: "Fehér Áron labor", room: "243-as terem", marker: "Marker005" },
      { name: "Nagy előadó", room: "114-es terem", marker: "Marker003" },
    ],
    []
  );

  // --- Debug marker list state ---
  const [markerNames, setMarkerNames] = useState([]);
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const [markerError, setMarkerError] = useState("");
  const [selectedMarker, setSelectedMarker] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMarkers() {
      setLoadingMarkers(true);
      setMarkerError("");

      try {
        const loader = new GLTFLoader();

        // cache-busting so you always see latest model during dev
        const url = `${API_URL}/model?cb=${Date.now()}`;

        const gltf = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });

        if (cancelled) return;

        const names = [];
        gltf.scene.traverse((child) => {
          const n = (child.name || "").trim();
          if (!n) return;

          // marker filter (case-insensitive)
          if (n.toLowerCase().includes("marker")) {
            names.push(n);
          }
        });

        // Unique + sort
        const uniqueSorted = Array.from(new Set(names)).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        );

        setMarkerNames(uniqueSorted);
      } catch (e) {
        console.error(e);
        setMarkerError("Nem sikerült betölteni a modellt / markereket.");
      } finally {
        if (!cancelled) setLoadingMarkers(false);
      }
    }

    loadMarkers();
    return () => {
      cancelled = true;
    };
  }, [API_URL]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Fontosabb egyetemi helyszínek</h1>
      <p>Ismerd meg a Sapientia campus kulcsfontosságú helyszíneit</p>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginTop: "40px",
        }}
      >
        {locations.map((location, index) => (
          <div
            key={index}
            style={{
              background: "var(--navbar-bg)",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2>{location.name}</h2>
              <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                {location.room}
              </p>
              <p style={{ marginTop: "8px", opacity: 0.85 }}>
                Marker: <b>{location.marker}</b>
              </p>
            </div>

            <Link
              to="/app/model"
              state={{ marker: location.marker }}
              style={{
                marginTop: "20px",
                padding: "10px 16px",
                borderRadius: "8px",
                textAlign: "center",
                backgroundColor: "var(--capsule-bg)",
                color: "white",
                fontWeight: "bold",
                textDecoration: "none",
              }}
            >
              Indítsd el a 3D modellt
            </Link>
          </div>
        ))}
      </div>

      {/* Debug panel */}
      <div
        style={{
          marginTop: "40px",
          padding: "16px",
          borderRadius: "12px",
          background: "rgba(0,0,0,0.05)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Marker debug lista</h3>
            <p style={{ marginTop: 6, marginBottom: 0, opacity: 0.8 }}>
              Itt látod az összes “marker” nevű objektumot, amit a GLTF-ben megtaláltunk.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            {loadingMarkers ? (
              <span>Betöltés…</span>
            ) : (
              <span>Talált: <b>{markerNames.length}</b></span>
            )}
          </div>
        </div>

        {markerError ? (
          <p style={{ marginTop: 12, color: "crimson" }}>{markerError}</p>
        ) : null}

        {/* Selected marker quick actions */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ padding: "8px 10px", background: "white", borderRadius: 8 }}>
            Kiválasztott:{" "}
            <b>{selectedMarker || "(nincs)"}</b>
          </div>

          <button
            type="button"
            disabled={!selectedMarker}
            onClick={() => copyToClipboard(selectedMarker)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: selectedMarker ? "pointer" : "not-allowed",
            }}
          >
            Másolás
          </button>
        </div>

        {/* Marker list */}
        <div
          style={{
            marginTop: 12,
            maxHeight: 240,
            overflow: "auto",
            background: "white",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.1)",
            padding: 10,
          }}
        >
          {loadingMarkers ? (
            <div style={{ padding: 8, opacity: 0.7 }}>Model betöltése…</div>
          ) : markerNames.length === 0 ? (
            <div style={{ padding: 8, opacity: 0.7 }}>
              Nem találtunk “marker” nevű objektumot a modellben.
            </div>
          ) : (
            markerNames.map((name) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 8,
                  marginBottom: 6,
                  background:
                    selectedMarker === name ? "rgba(46,125,50,0.10)" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedMarker(name)}
                title="Kattints a kijelöléshez"
              >
                <span style={{ fontFamily: "monospace" }}>{name}</span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(name);
                    setSelectedMarker(name);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  Másol
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}