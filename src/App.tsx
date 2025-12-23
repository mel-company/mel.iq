import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import Templates from "./pages/Templates";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StoreManagement from "./pages/StoreManagement";
import { useAuth } from "./contexts/AuthContext";
import { ReactNode } from "react";
import OTPVerification from "./pages/Otp";
import { Toaster } from "./components/ui/sonner";

type ProtectedRouteProps = {
  children: ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      <Toaster />
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <Navbar />
              <Login />
            </>
          }
        />
        <Route
          path="/otp"
          element={
            <>
              <OTPVerification />
            </>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navbar />
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/store/:storeId/manage"
          element={
            <ProtectedRoute>
              <StoreManagement />
            </ProtectedRoute>
          }
        />
        {/* Catch-all route for invalid store paths */}
        <Route
          path="/store/*"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <Landing />
            </>
          }
        />
        <Route
          path="/pricing"
          element={
            <>
              <Navbar />
              <Pricing />
            </>
          }
        />
        <Route
          path="/about"
          element={
            <>
              <Navbar />
              <About />
            </>
          }
        />
        <Route
          path="/contact"
          element={
            <>
              <Navbar />
              <Contact />
            </>
          }
        />
        <Route
          path="/checkout"
          element={
            <>
              <Navbar />
              <Checkout />
            </>
          }
        />
        <Route
          path="/templates"
          element={
            <>
              <Navbar />
              <Templates />
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
