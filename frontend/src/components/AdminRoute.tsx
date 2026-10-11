import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
