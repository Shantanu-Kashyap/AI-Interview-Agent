import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AUTH_TOKEN_KEY = "interview_auth_token";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

const getStoredToken = () => {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    }
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage failures (private mode / restricted environments)
  }
};

export const clearAuthToken = () => setAuthToken(null);

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;

    if (!config || config._retry) {
      return Promise.reject(error);
    }

    const method = (config.method || "get").toLowerCase();
    const status = error?.response?.status;
    const isNetworkError = !error?.response || error?.code === "ECONNABORTED";
    const isRetryableStatus = typeof status === "number" && status >= 500;

    if (method === "get" && (isNetworkError || isRetryableStatus)) {
      config._retry = true;
      await sleep(700);
      return apiClient(config);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
