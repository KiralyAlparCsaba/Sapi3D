import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import useAuthGuard from "../auth/useAuthGuard";

export default function ProtectedLayout() {
  useAuthGuard();

  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );
  
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="protected-layout">
      <Navbar theme={theme} setTheme={setTheme}  />
      <div className="page-content">
        <Outlet />
      </div>
    </div>
  );
}
