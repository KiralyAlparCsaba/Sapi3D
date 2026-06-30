import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function useAuthGuard({ requireAdmin = false } = {}) {
  const navigate = useNavigate();

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

      if (decoded.role_id === 0) return;

      if (requireAdmin && decoded.role_id !== 2) {
        navigate("/app");
      }
    } catch {
      sessionStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate, requireAdmin]);
}
