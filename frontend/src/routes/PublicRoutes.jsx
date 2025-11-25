import React from "react";
import { Routes, Route } from "react-router-dom";

import LandingPage from "../components/auth/LandingPage";
import Login from "../components/auth/Login";
import Register from "../components/auth/Register";

export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
