import { useContext } from "react";
import { AuthContext } from "./authContextStore";
import type { AuthContextValue } from "../types/auth";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
