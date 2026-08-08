import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useMe } from "@/api/wrappers/auth.wrappers";

type Store = {
  token: string;
  username: string;
};

type AuthContextValue = {
  user: Store | null;
  loading: boolean;
  login: (token: string, username: string) => { success: boolean; user: Store };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearBadToken() {
  const token = window.localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
  }
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
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

  const login = (token: string, username: string) => {
    const userData = {
      token,
      username,
    };
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return { success: true, user: userData };
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    setUser(null);
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
