import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import "../../styles/Register.css";

const RESEND_COOLDOWN_SECONDS = 180;

function formatCooldown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

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
    return (
      detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(" | ") || "Hibás adatok"
    );
  }
  return "Hiba történt a regisztráció során!";
}

export default function Register() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("register");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

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
      setIsRegistering(true);
      await api.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      setRegisteredEmail(formData.email);
      setVerificationCode("");
      setPhase("verify");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setSuccess(
        "Sikeres regisztráció! Az emailben kapott 6 jegyű kóddal erősítsd meg a fiókodat. A kód 3 percig érvényes.",
      );
    } catch (err) {
      console.error("Regisztrációs hiba:", err);
      setError(normalizeBackendError(err.response?.data?.detail));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (verificationCode.length !== 6) {
      setError("A kód pontosan 6 számjegyű legyen.");
      return;
    }

    try {
      setIsVerifying(true);
      await api.post("/auth/verify-email-code", {
        email: registeredEmail,
        code: verificationCode,
      });

      setSuccess(
        "Sikeres email verifikáció! Átirányítás a bejelentkezéshez...",
      );
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(normalizeBackendError(err.response?.data?.detail));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!registeredEmail || resendCooldown > 0) return;

    setError("");
    setSuccess("");

    try {
      setIsResending(true);
      await api.post("/auth/resend-verification-code", {
        email: registeredEmail,
      });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setSuccess("Új kódot küldtünk az emailedre.");
    } catch (err) {
      setError(normalizeBackendError(err.response?.data?.detail));
    } finally {
      setIsResending(false);
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
        <h1>{phase === "register" ? "Regisztráció" : "Email verifikáció"}</h1>

        {phase === "register" ? (
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
            <button
              type="submit"
              className="register-btn"
              disabled={isRegistering}
            >
              {isRegistering ? "Regisztrálás..." : "Regisztráció"}
            </button>
          </form>
        ) : (
          <form className="register-form" onSubmit={handleVerifySubmit}>
            <p className="verification-hint">
              Add meg a 6 jegyű kódot, amit erre az email címre küldtünk:{" "}
              {registeredEmail}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="code-input"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(e.target.value.replace(/\D/g, ""))
              }
              required
            />
            <button
              type="submit"
              className="register-btn"
              disabled={isVerifying}
            >
              {isVerifying ? "Ellenőrzés..." : "Kód ellenőrzése"}
            </button>

            <div className="resend-row">
              <button
                type="button"
                className="secondary-btn"
                disabled={isResending || resendCooldown > 0}
                onClick={handleResendCode}
              >
                {isResending ? "Küldés..." : "Kód újraküldése"}
              </button>
              {resendCooldown > 0 && (
                <span className="cooldown-text">
                  Új küldés {formatCooldown(resendCooldown)} múlva
                </span>
              )}
            </div>
          </form>
        )}

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <p className="login-link-text">
          Már van fiókod? <Link to="/login">Jelentkezz be</Link>
        </p>
      </div>
    </div>
  );
}
