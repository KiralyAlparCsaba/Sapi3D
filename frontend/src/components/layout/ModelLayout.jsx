import { Outlet } from "react-router-dom";
import useAuthGuard from "../auth/useAuthGuard";

export default function ModelLayout() {
  useAuthGuard();
  return <Outlet />;
}
