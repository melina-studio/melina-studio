import api, { setTokenUpdateCallback } from "@/lib/axios";
import { BaseURL } from "@/lib/constants";
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

export const updateUser = async (formData: FormData) => {
  try {
    const response = await api.patch("/api/v1/auth/me/update", formData);
    return response.data;
  } catch (error: any) {
    console.log(error, "Error updating user");
    throw new Error(error?.response?.data?.error || "Error updating user");
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

export const googleLogin = () => {
  // OAuth requires full browser navigation, not AJAX
  // The callback will redirect back to the frontend after setting cookies
  window.location.href = `${BaseURL}/api/v1/auth/oauth/google`;
};

export const githubLogin = () => {
  // OAuth requires full browser navigation, not AJAX
  // The callback will redirect back to the frontend after setting cookies
  window.location.href = `${BaseURL}/api/v1/auth/oauth/github`;
};

// save custom rules
export const saveCustomRules = async (rules: string) => {
  try {
    const response = await api.post("/api/v1/auth/custom-rules", { rules: rules });
    return response.data;
  } catch (error: any) {
    console.log(error, "Error saving custom rules");
    throw new Error(error?.error || "Error saving custom rules");
  }
};

// fetch custom rules
export const fetchCustomRules = async () => {
  try {
    const response = await api.get("/api/v1/auth/custom-rules");
    return response.data;
  } catch (error: any) {
    console.log(error, "Error fetching custom rules");
    throw new Error(error?.error || "Error fetching custom rules");
  }
};
