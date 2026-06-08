import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// ── Request interceptor: csatolja a tokent ──
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 → session lezárás + redirect ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      closeSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

/**
 * Session lezárása és kijelentkezés.
 * Fetch + keepalive-ot használ, hogy lejárt token esetén is működjön,
 * és az oldal elhagyásakor is elküldje a kérést.
 */
export function closeSessionAndRedirect() {
  const sessionId = sessionStorage.getItem("session_id");

  if (sessionId) {
    fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ended_at: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {}); // silent fail — ne blokkolja a redirectet
  }

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("session_id");

  // Csak akkor redirectelünk ha nem vagyunk már a login oldalon
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export default api;
