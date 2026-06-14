import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Login.css";
import { metricsCollector } from "../three/metricsCollector.js";

function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const containerRef = useRef(null);
  const handleMouseMove = (event) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--mx", x.toFixed(3));
    el.style.setProperty("--my", y.toFixed(3));
  };

  const handleMouseLeave = () => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", {
        username: formData.username,
        password: formData.password,
      });

      const token = res.data.access_token;
      login(token);

      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = parseInt(payload.sub, 10);
      const sessionId = payload.session_id;

      sessionStorage.setItem("session_id", sessionId);
      metricsCollector.setSession(sessionId);

      navigate("/app");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || "Hibás felhasználónév vagy jelszó!");
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    try {
      const res = await api.post("/auth/guest");
      login(res.data.access_token);
      navigate("/app");
    } catch (err) {
      setError("Vendég belépés sikertelen. Kérjük próbáld újra.");
    }
  };

  return (
    <div 
      className="login-container" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Háttér dekoráció - Blobok */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />
      <div className="blob blob-4" aria-hidden="true" />

      <div className="login-card">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Bejelentkezés</h2>
          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder="Felhasználónév"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Jelszó"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="login-btn">Belépés</button>

          <div className="login-divider">
            <span>vagy</span>
          </div>

          <button
            type="button"
            className="login-btn login-btn--guest"
            onClick={handleGuestLogin}
          >
            Vendégként folytatom
          </button>

          {error && <p className="error-text">{error}</p>}

          <p className="register-text">
            Nincs még fiókod? <Link to="/register">Regisztrálj itt</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;