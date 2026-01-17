import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { BaseURL } from "./constants";

interface FailedRequest {
  resolve: () => void;
  reject: (error: unknown) => void;
}

const api = axios.create({
  baseURL: BaseURL,
  withCredentials: true, // Send cookies with requests
});

/* ------------------ REFRESH TOKEN FLOW ------------------ */

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

/* ------------------ RESPONSE INTERCEPTOR ------------------ */

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => {
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }
    isRefreshing = true;

    try {
      // Call refresh endpoint - cookies are sent automatically
      await api.post("/api/v1/auth/refresh");

      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      // Redirect to login on refresh failure
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
