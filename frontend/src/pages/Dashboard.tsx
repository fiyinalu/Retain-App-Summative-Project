import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout(): void {
    logout();
    navigate("/login");
  }

  return (
    <main>
      <h1>Retain Dashboard</h1>

      <p>Welcome, {user?.name}.</p>
      <p>{user?.email}</p>

      <button type="button" onClick={handleLogout}>
        Sign out
      </button>
    </main>
  );
}
