"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
  getMe,
} from "@/service/auth";
import { RegisterPayload } from "@/lib/types";

export type Subscription = "free" | "pro" | "enterprise";

export interface User {
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  subscription: Subscription;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Fetch current user from /me endpoint
  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMe();
      setUser(data.user);
    } catch (err: any) {
      console.error("Failed to fetch user:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await loginService(email, password);
      // Cookies are set by the server, just set the user
      setUser(data.user);
    } catch (err: any) {
      const message = err.message || "Login failed";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Signup
  const signup = useCallback(async (payload: RegisterPayload) => {
    try {
      setIsLoading(true);
      setError(null);
      await registerService(payload);
      // Cookies are set by the server, fetch user data
      await fetchUser();
    } catch (err: any) {
      const message = err.message || "Signup failed";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      // Always clear user state
      setUser(null);
      setError(null);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
