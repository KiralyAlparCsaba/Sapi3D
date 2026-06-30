import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      closeSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

export function closeSessionAndRedirect() {
  const sessionId = sessionStorage.getItem("session_id");

  if (sessionId) {
    fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ended_at: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  }

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("session_id");

  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export default api;
