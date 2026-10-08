import type {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
} from "../types/auth";

const API_BASE_URL = "http://127.0.0.1:8000";

async function parseResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json();

  if (!response.ok) {
    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      throw new Error(data.detail);
    }

    throw new Error("Something went wrong. Please try again.");
  }

  return data as T;
}

export async function registerUser(
  data: RegisterData,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseResponse<AuthResponse>(response);
}

export async function loginUser(
  data: LoginData,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseResponse<AuthResponse>(response);
}

export async function getCurrentUser(
  token: string,
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<User>(response);
}
