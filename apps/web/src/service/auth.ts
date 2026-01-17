import api, { setTokenUpdateCallback } from "@/lib/axios";
import { RegisterPayload } from "@/lib/types";

// Token management for WebSocket auth - will be set by AuthProvider
let accessTokenRef: { current: string | null } | null = null;

export const setAccessTokenRef = (ref: { current: string | null }) => {
  accessTokenRef = ref;

  // Register callback to update token when axios refreshes it
  setTokenUpdateCallback((token: string) => {
    if (accessTokenRef) {
      accessTokenRef.current = token;
    }
  });
};

export const getAccessToken = () => {
  return accessTokenRef?.current ?? null;
};

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post("/api/v1/auth/login", {
      email,
      password,
    });
    return response.data;
  } catch (error: any) {
    console.log(error, "Error logging in");
    throw new Error(error?.response?.data?.error || "Error logging in");
  }
};

export const register = async (payload: RegisterPayload) => {
  try {
    const response = await api.post("/api/v1/auth/register", {
      ...payload,
    });
    return response.data;
  } catch (error: any) {
    console.log(error, "Error registering");
    throw new Error(error?.response?.data?.error || "Error registering");
  }
};

export const logout = async () => {
  try {
    const response = await api.post("/api/v1/auth/logout");
    return response.data;
  } catch (error: any) {
    console.log(error, "Error logging out");
    throw new Error(error?.response?.data?.error || "Error logging out");
  }
};

export const getMe = async () => {
  try {
    const response = await api.get("/api/v1/auth/me");
    return response.data;
  } catch (error: any) {
    console.log(error, "Error fetching user");
    throw new Error(error?.response?.data?.error || "Error fetching user");
  }
};

export const refreshToken = async () => {
  try {
    const response = await api.post("/api/v1/auth/refresh");
    return response.data;
  } catch (error: any) {
    console.log(error, "Error refreshing token");
    throw new Error(error?.response?.data?.error || "Error refreshing token");
  }
};
