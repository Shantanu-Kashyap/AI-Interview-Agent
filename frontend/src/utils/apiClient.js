import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
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
