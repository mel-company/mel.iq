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

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // جلب بيانات المستخدم من الباك إند إذا التوكن صالح
  const { data: meData, isLoading: meLoading, isError } = useMe();

  useEffect(() => {
    // لو ما زال طلب /auth/me شغّال، نبقي loading
    if (meLoading) {
      setLoading(true);
      return;
    }

    if (meData) {
      // توكن صحيح والباك إند رجّع يوزر
        setUser(meData as Store);
      setLoading(false);
      return;
    }

    // في حالة ماكو يوزر من الباك إند (أو خطأ)، نرجع للفحص من localStorage


    setLoading(false);
  }, [meData, meLoading, isError]);

  const login = (token: string, username: string) => {
    // Simulate login - in production, this would be an API call
    const userData = {
      token,
      username,
    };
    setUser(userData);
    return { success: true, user: userData };
  };

  const logout = () => {
    setUser(null);
  };
    
  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading }}
    >
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
