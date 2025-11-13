import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Navbar from "./layout/Navbar";
import Sidebar from "./layout/Sidebar";
import ThreeScene from "./three/ThreeScene";
import "../styles/App.css";

export default function MainApp() {
  const [role, setRole] = useState(null);
  const [activeMenu, setActiveMenu] = useState("home");
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return navigate("/login");

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp < now) {
        sessionStorage.removeItem("token");
        navigate("/login");
      } else {
        setRole(decoded.role_id === 2 ? "admin" : "user");
      }
    } catch {
      sessionStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login");
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
