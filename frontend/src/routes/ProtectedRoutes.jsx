import React from "react";
import { Routes, Route } from "react-router-dom";

import MainApp from "../components/MainApp";

export default function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/app" element={<MainApp />} />
    </Routes>
  );
}
