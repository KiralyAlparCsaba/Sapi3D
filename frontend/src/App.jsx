import React, { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ThreeScene from "./components/three/ThreeScene";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Főoldal – a mostani 3D modell UI */}
        <Route path="/" element={<MainApp />} />

        {/* Login és Register oldalak */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

function MainApp() {
  const [role, setRole] = useState(null); // null = nincs login, "user" vagy "admin"
  const [activeMenu, setActiveMenu] = useState("home");

  // Kilépés
  const handleLogout = () => {
    setRole(null);
    setActiveMenu("home");
  };

  // Belépés
  if (!role) {
    return (
      <div className="login-screen">
        <h1>Login</h1>
        <div>
          <button className="btn user-btn" onClick={() => setRole("user")}>
            Login as User
          </button>
          <button className="btn admin-btn" onClick={() => setRole("admin")}>
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  // Minimal UI a 3D modell oldalhoz
  if (activeMenu === "model") {
    return (
      <div className="model-container">
        <ThreeScene />
        <button className="back-btn" onClick={() => setActiveMenu("home")}>
          ← Vissza
        </button>
      </div>
    );
  }

  // Menü elemek
  const menuItems = [
    { key: "home", label: "Főoldal" },
    { key: "model", label: "3D Modell" },
    { key: "about", label: "Információk" },
  ];
  if (role === "admin") {
    menuItems.push({ key: "admin", label: "Admin" });
  }

  // Oldal fő tartalom
  const renderMainContent = () => {
    switch (activeMenu) {
      case "home":
        return <p>Ez a főoldal tartalma.</p>;
      case "about":
        return <p>Itt lesznek az információk.</p>;
      case "admin":
        return role === "admin" ? (
          <p>Itt lesz az admin oldal (pl. statisztikák, grafikonok).</p>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="content">
        <main className="main-content">{renderMainContent()}</main>
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
