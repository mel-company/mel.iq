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
      // امسح الجلسة المحلية فقط إذا /auth/me أو refresh فشلوا —
      // 401 من أي endpoint ثاني (صلاحيات/دومين/…) ما يعني إن المستخدم طالع
      const isSessionCheck =
        url.includes("/auth/me") || url.includes("/auth/refresh");

      if (isSessionCheck) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
