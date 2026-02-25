import { Link } from "react-router-dom";
import { useMemo } from "react";

export default function LocationsPage() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- Your location cards (edit markers later from the list below) ---
  const locations = useMemo(
    () => [
      { name: "Dékáni hivatal", room: "232-es terem", marker: "Marker001" },
      { name: "Fehér Áron labor", room: "243-as terem", marker: "Marker005" },
      { name: "Nagy előadó", room: "114-es terem", marker: "Marker003" },
      { name: "Könyvtár", room: "Könyvtár", marker: "Marker002" },
      { name: "Büfé", room: "Büfé", marker: "Marker004" },
      { name: "Matematika-informatika tanszék", room: "Matematika-informatika tanszék", marker: "Marker006" },
      { name: "Villamosmérnöki tanszék", room: "Villamosmérnöki tanszék", marker: "Marker007" },
      { name: "Gépészmérnöki tanszék", room: "Gépészmérnöki tanszék", marker: "Marker008" },
      { name: "Kertészmérnöki tanszék", room: "Kertészmérnöki tanszék", marker: "Marker009" },
      { name: "Brassai labor", room: "Brassai labor", marker: "Marker010" },
    ],
    []
  );

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
    </div>
  );
}