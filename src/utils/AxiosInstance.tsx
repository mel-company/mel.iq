import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "https://api.mel.iq/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

function readRefreshToken(): string | null {
  const direct = localStorage.getItem("refreshToken");
  if (direct && direct !== "undefined" && direct !== "null") return direct;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { refreshToken?: string };
    return parsed.refreshToken || null;
  } catch {
    return null;
  }
}

function persistTokens(token: string, refreshToken?: string | null) {
  localStorage.setItem("token", token);
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        token,
        ...(refreshToken ? { refreshToken } : {}),
      }),
    );
  } catch {
    // ignore corrupt user blob
  }
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

/** Quietly exchange the stored refresh token for a new access token. */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(
        `${axiosInstance.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true, timeout: 15000 },
      );
      const nextToken = data?.token || data?.accessToken;
      const nextRefresh = data?.refreshToken || refreshToken;
      if (!nextToken) return null;
      persistTokens(nextToken, nextRefresh);
      return nextToken as string;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryConfig | undefined;
    const url = String(original?.url || "");

    const isAuthRefreshCall =
      url.includes("/auth/refresh") || url.includes("/auth/login");

    if (status === 401 && original && !original._retry && !isAuthRefreshCall) {
      original._retry = true;
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${nextToken}`;
        return axiosInstance(original);
      }

      // Refresh failed — only wipe when the session itself is gone
      if (url.includes("/auth/me")) {
        clearSession();
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
