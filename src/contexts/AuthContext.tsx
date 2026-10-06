import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/api/wrappers/auth.wrappers";

type Store = {
  token: string;
  username: string;
};

type AuthContextValue = {
  user: Store | null;
  loading: boolean;
  login: (
    token: string,
    username: string,
    refreshToken?: string | null,
  ) => { success: boolean; user: Store };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearBadToken() {
  const token = window.localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("user");
  }
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearBadToken();
  }, []);

  const { data: meData, isLoading: meLoading, isError } = useMe();

  useEffect(() => {
    if (meLoading) {
      setLoading(true);
      return;
    }

    if (meData) {
      setUser(meData as Store);
      setLoading(false);
      return;
    }

    // /auth/me فشل أو ماكو توكن → اعتبر المستخدم غير مسجل
    if (isError) {
      clearBadToken();
      setUser(null);
    }

    setLoading(false);
  }, [meData, meLoading, isError]);

  const login = (
    token: string,
    username: string,
    refreshToken?: string | null,
  ) => {
    const userData = {
      token,
      username,
      ...(refreshToken ? { refreshToken } : {}),
    };
    window.localStorage.setItem("token", token);
    if (refreshToken) {
      window.localStorage.setItem("refreshToken", refreshToken);
    }
    window.localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return { success: true, user: userData };
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("user");
    setUser(null);
    // Drop cached /auth/me, stores, etc. — otherwise the nav stays "logged in"
    // until a hard refresh because React Query still holds the old session.
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
