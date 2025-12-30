import axios from "axios";

// alapértelmezett backend URL
const api = axios.create({
  baseURL: "http://localhost:8000", 
});


// ha van token, automatikusan hozzáadja
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
