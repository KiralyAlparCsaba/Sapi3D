import React, { useState, useEffect } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ThreeScene from "./components/three/ThreeScene";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import LandingPage from "./components/LandingPage";
import { jwtDecode } from "jwt-decode";


export default function App() {
  return (
    <Router>
      <Routes>
     
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

       
        <Route path="/app" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

function MainApp() {
  const [role, setRole] = useState(null);
  const [activeMenu, setActiveMenu] = useState("home");
  const navigate = useNavigate();

 
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp < now) {
        console.warn("Token lejart!");
        sessionStorage.removeItem("token");
        navigate("/login");
      } else {
        
        if (decoded.role_id) {
          setRole(decoded.role_id === 2 ? "admin" : "user");
        } else {
          setRole("user");
        }
      }
    } catch (err) {
      console.error("JWT decode hiba:", err);
      sessionStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    setRole(null);
    setActiveMenu("home");
    navigate("/login");
  };

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

  const menuItems = [
    { key: "home", label: "Főoldal" },
    { key: "model", label: "3D Modell" },
    { key: "about", label: "Információk" },
  ];
  if (role === "admin") {
    menuItems.push({ key: "admin", label: "Admin" });
  }

  
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
