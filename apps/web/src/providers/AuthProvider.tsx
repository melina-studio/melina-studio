"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
  getMe,
  setAccessTokenRef,
  googleLogin as googleLoginService,
  githubLogin as githubLoginService,
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
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleLogin: () => void;
  githubLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const isAuthenticated = !!user;

  // Keep ref in sync with state for axios interceptor
  const updateAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
    setAccessToken(token);
  }, []);

  // Register the token ref with auth service (for axios refresh callback)
  setAccessTokenRef(accessTokenRef);

  // Fetch current user from /me endpoint
  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMe();
      setUser(data.user);
      // Update token if returned (from refresh)
      if (data.access_token) {
        updateAccessToken(data.access_token);
      }
    } catch (err: any) {
      console.error("Failed to fetch user:", err);
      setUser(null);
      updateAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [updateAccessToken]);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await loginService(email, password);
        // Cookies are set by the server, save user and access token
        setUser(data.user);
        updateAccessToken(data.access_token);
      } catch (err: any) {
        const message = err.message || "Login failed";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [updateAccessToken]
  );

  // Signup
  const signup = useCallback(
    async (payload: RegisterPayload) => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await registerService(payload);
        // Cookies are set by the server, save access token and fetch user
        updateAccessToken(data.access_token);
        await fetchUser();
      } catch (err: any) {
        const message = err.message || "Signup failed";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUser, updateAccessToken]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      // Always clear user state and token
      setUser(null);
      updateAccessToken(null);
      setError(null);
    }
  }, [updateAccessToken]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Google login - redirects browser to OAuth flow
  const googleLogin = useCallback(() => {
    googleLoginService();
  }, []);

  // Github login - redirects browser to OAuth flow
  const githubLogin = useCallback(() => {
    githubLoginService();
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated,
    error,
    login,
    signup,
    logout,
    refreshUser,
    googleLogin,
    githubLogin,
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
