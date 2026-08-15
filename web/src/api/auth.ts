import apiClient from "./client";
import type { LoginRequest, LoginResponse } from "../types/auth";

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

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
};

export const getCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};
