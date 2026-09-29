import apiClient from "./client";
import type { LoginRequest, LoginResponse, User } from "../types/auth";

// Supabase auth endpoint (theo requests.http)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const login = async (
  credentials: LoginRequest,
): Promise<LoginResponse> => {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    },
  );

  // Supabase answers a wrong password with 4xx and a machine-readable body;
  // a plain message keeps the login form readable without leaking which of
  // email or password was wrong.
  if (!response.ok) {
    throw new Error("Email hoặc mật khẩu không đúng.");
  }

  return response.json();
};

/** The application `User` (not the Supabase auth user) behind the current token. */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
};
