import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import PublicRoutes from "./routes/PublicRoutes";
import ProtectedRoutes from "./routes/ProtectedRoutes";

export default function App() {
  return (
    <Router>
      <PublicRoutes />
      <ProtectedRoutes />
    </Router>
  );
}
