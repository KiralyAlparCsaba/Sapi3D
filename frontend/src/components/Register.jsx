import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Register.css";

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

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Az email formátuma érvénytelen (pl. valami@domain.hu)");
      return;
    }

    if (formData.password.length < 8) {
      setError("A jelszónak legalább 8 karakter hosszúnak kell lennie!");
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
        role_id: 1, 
      });

      console.log("Regisztráció sikeres:", res.data);
      setSuccess("Sikeres regisztráció! Átirányítás a bejelentkezéshez...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("Regisztrációs hiba:", err);
      if (err.response && err.response.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Hiba történt a regisztráció során!");
      }
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
            placeholder="Jelszó (min. 8 karakter)"
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
