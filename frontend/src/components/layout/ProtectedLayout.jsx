import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Navbar from "./Navbar";
import ThreeScene from "../three/ThreeScene";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isModelView = location.search.includes("view=model");

  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  const [warning, setWarning] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);

      
      if (decoded.exp * 1000 < Date.now()) {
        sessionStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const isAdmin = decoded.role_id === 2;

      
      if (location.pathname === "/app/admin" && !isAdmin) {
        setWarning("Nincs jogosultságod az oldal megtekintéséhez.");

        navigate("/app");
      }
    } catch {
      sessionStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!warning) return;

    const timer = setTimeout(() => {
      setWarning("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [warning]);


  return (
    <div className="protected-layout">

      {!isModelView && (
        <Navbar theme={theme} setTheme={setTheme} warning={warning} />
      )}

      <div className="page-content">
        {isModelView ? <ThreeScene /> : <Outlet />}
      </div>

    </div>
  );
}
