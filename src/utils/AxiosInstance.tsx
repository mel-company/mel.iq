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
/** Access token produced by the last successful refresh (cooldown gate). */
let lastFreshAccessToken: string | null = null;
let lastRefreshAt = 0;
const REFRESH_COOLDOWN_MS = 8_000;

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

/** Mirror OTP verify: body may be flat or nested under `data`. */
function extractAuthTokens(payload: unknown): {
  token: string | null;
  refreshToken: string | null;
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  const token =
    (typeof root.token === "string" && root.token) ||
    (typeof root.accessToken === "string" && root.accessToken) ||
    (typeof nested?.token === "string" && nested.token) ||
    (typeof nested?.accessToken === "string" && nested.accessToken) ||
    null;
  const refreshToken =
    (typeof root.refreshToken === "string" && root.refreshToken) ||
    (typeof nested?.refreshToken === "string" && nested.refreshToken) ||
    null;
  return { token, refreshToken };
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
  lastFreshAccessToken = null;
  lastRefreshAt = 0;
}

function setAuthHeader(config: InternalAxiosRequestConfig, token: string) {
  const value = `Bearer ${token}`;
  const headers = config.headers;
  if (headers && typeof (headers as { set?: unknown }).set === "function") {
    (headers as { set: (k: string, v: string) => void }).set(
      "Authorization",
      value,
    );
  } else {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = value;
  }
}

/** Quietly exchange the stored refresh token for a new access token. */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  // A 401 right after a successful refresh is almost never "expired token"
  // (store-plans / entitlements often mean authz). Refreshing again only
  // storms the network and can rotate the refresh token uselessly.
  const current = localStorage.getItem("token");
  if (
    lastFreshAccessToken &&
    current === lastFreshAccessToken &&
    Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS
  ) {
    return null;
  }

  refreshPromise = (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(
        `${axiosInstance.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true, timeout: 15000 },
      );
      const extracted = extractAuthTokens(data);
      const nextToken = extracted.token;
      const nextRefresh = extracted.refreshToken || refreshToken;
      if (!nextToken) return null;
      persistTokens(nextToken, nextRefresh);
      lastFreshAccessToken = nextToken;
      lastRefreshAt = Date.now();
      return nextToken;
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
      setAuthHeader(config, token);
    } else if (config.headers) {
      if (typeof (config.headers as { delete?: unknown }).delete === "function") {
        (config.headers as { delete: (k: string) => void }).delete(
          "Authorization",
        );
      } else {
        delete (config.headers as Record<string, unknown>).Authorization;
      }
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
        setAuthHeader(original, nextToken);
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
