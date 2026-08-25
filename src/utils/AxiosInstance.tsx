import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "https://api.mel.iq/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    // فقط أرسل Authorization إذا في توكن حقيقي (لا ترسل Bearer undefined)
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
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || "");
      // امسح التوكن التالف فقط على طلبات تحتاج تسجيل دخول (مو login/register/otp)
      const isPublicAuth =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/send-otp") ||
        url.includes("/auth/verify");
      // جاهزية الداشبورد: فشل الفحص ما يعني جلسة منتهية
      const isDashboardReady = url.includes("/domain/dashboard-ready");

      if (!isPublicAuth && !isDashboardReady) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
