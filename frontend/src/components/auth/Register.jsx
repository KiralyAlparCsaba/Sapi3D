import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import "../../styles/Register.css";

function getPasswordValidationMessage(password) {
  const missing = [];
  if (password.length < 8) missing.push("legalább 8 karakter");
  if (!/[a-z]/.test(password)) missing.push("legalább 1 kisbetű");
  if (!/[A-Z]/.test(password)) missing.push("legalább 1 nagybetű");
  if (!/[0-9]/.test(password)) missing.push("legalább 1 szám");

  if (missing.length === 0) return "";
  return `A jelszóból hiányzik: ${missing.join(", ")}.`;
}

function normalizeBackendError(detail) {
  if (!detail) return "Hiba történt a regisztráció során!";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(" | ") || "Hibás adatok";
  }
  return "Hiba történt a regisztráció során!";
}

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");

    const passwordMessage = getPasswordValidationMessage(formData.password);
    if (passwordMessage) {
      setError(passwordMessage);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("A jelszavak nem egyeznek!");
      return;
    }

    try {
      const res = await api.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      console.log("Regisztráció sikeres:", res.data);
      setSuccess("Sikeres regisztráció! Átirányítás a bejelentkezéshez...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("Regisztrációs hiba:", err);
      setError(normalizeBackendError(err.response?.data?.detail));
    }
  };

  return (
    <div
      className="register-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >

      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />
      <div className="blob blob-4" aria-hidden="true" />

      <div className="register-card">
        <h1>Regisztráció</h1>
        <form className="register-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Felhasználónév"
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Jelszó"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Jelszó megerősítése"
            onChange={handleChange}
            required
          />
          <button type="submit" className="register-btn">Regisztráció</button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <p className="login-link-text">
          Már van fiókod? <Link to="/login">Jelentkezz be</Link>
        </p>
      </div>
    </div>
  );
}
