import React, { useState } from "react";
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
    <div className="register-container">
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
          <button type="submit">Regisztráció</button>
        </form>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        {success && <p style={{ color: "limegreen", marginTop: "10px" }}>{success}</p>}

        <p>
          Már van fiókod? <Link to="/login">Jelentkezz be</Link>
        </p>
      </div>
    </div>
  );
}
