import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/Login.css";
import {metricsCollector} from "../three/metricsCollector.js";

function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 1️⃣ Login request
      const res = await api.post("/auth/login", {
        username: formData.username,
        password: formData.password,
      });

      const token = res.data.access_token;

      // Store token
      sessionStorage.setItem("token", token);

      // 2️⃣ Decode JWT and extract BOTH user_id + session_id
      const payload = JSON.parse(atob(token.split(".")[1]));

      const userId = parseInt(payload.sub, 10);
      const sessionId = payload.session_id;

      console.log("Decoded user_id:", userId);
      console.log("Decoded session_id:", sessionId);

      // Save session id
      sessionStorage.setItem("session_id", sessionId);

      // For metrics system
      metricsCollector.setSession(sessionId);


      // 3️⃣ Redirect — session will now be created by backend login handler
      navigate("/app");

    } catch (err) {
      console.error("Login error:", err);
      setError("Hibás felhasználónév vagy jelszó!");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Bejelentkezés</h2>
        <input
          type="text"
          name="username"
          placeholder="Felhasználónév"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Jelszó"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Belépés</button>
        {error && <p className="error-text">{error}</p>}
        <p>
          Nincs még fiókod? <Link to="/register">Regisztrálj itt</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
