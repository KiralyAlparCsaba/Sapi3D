import { Outlet } from "react-router-dom";
import useAuthGuard from "../auth/useAuthGuard";

export default function AdminLayout() {
  useAuthGuard({ requireAdmin: true });
  return <Outlet />;
}
