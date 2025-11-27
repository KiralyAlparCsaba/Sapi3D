import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Navbar from "./layout/Navbar";
import Sidebar from "./layout/Sidebar";
import ThreeScene from "./three/ThreeScene";
import "../styles/App.css";

import api from "../services/api";
import { metricsCollector } from "./three/metricsCollector";
import { weightedAverage } from "./three/weightedAverage";

export default function MainApp() {
  const [role, setRole] = useState(null);
  const [activeMenu, setActiveMenu] = useState("home");
  const navigate = useNavigate();

  // Auth check – main branch behavior
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return navigate("/login");

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp < now) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("session_id");
        navigate("/login");
      } else {
        setRole(decoded.role_id === 2 ? "admin" : "user");
      }
    } catch {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("session_id");
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = async () => {
  const sessionId = sessionStorage.getItem("session_id");

  try {
    // Only end the session — do NOT flush metrics here
    if (sessionId) {
      await api.put(`/sessions/${sessionId}`, {
        ended_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Failed to end session on logout:", e);
  } finally {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("session_id");

    // Hard redirect = safest for logout
    window.location.assign("/login");
  }
};


  if (activeMenu === "model") {
    return (
      <div className="model-container">
        <ThreeScene />
        <button onClick={() => setActiveMenu("home")} className="back-btn">
          ← Vissza
        </button>
      </div>
    );
  }

  const menuItems = [
    { key: "home", label: "Főoldal" },
    { key: "model", label: "3D Modell" },
    { key: "about", label: "Információk" },
  ];

  if (role === "admin") {
    menuItems.push({ key: "admin", label: "Admin" });
  }

  return (
    <div className="app-container">
      <Navbar />
      <div className="content">
        <main className="main-content">
          {activeMenu === "home" && <p>Ez a főoldal tartalma.</p>}
          {activeMenu === "about" && <p>Itt lesznek az információk.</p>}
          {activeMenu === "admin" && role === "admin" && <p>Admin oldal.</p>}
        </main>

        <Sidebar
          menuItems={menuItems}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          handleLogout={handleLogout}
        />
      </div>
    </div>
  );
}
