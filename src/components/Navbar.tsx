import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

function Navbar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white dark:bg-black shadow-lg sticky top-0 z-50 transition-colors duration-200 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navbar Container - 3 Sections */}
        <div className="flex justify-between items-center h-16">
          {/* Section 1: Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link
              to="/"
              className="text-2xl font-bold text-black dark:text-white transition-colors"
            >
              mel.iq
            </Link>
          </div>

          {/* Section 2: Navigation Links - Desktop Only */}
          <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
            <Link
              to="/"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/")
                  ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                  : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              الرئيسية
            </Link>
            <Link
              to="/pricing"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/pricing")
                  ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                  : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              الأسعار
            </Link>
            <Link
              to="/about"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/about")
                  ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                  : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              حولنا
            </Link>
            <Link
              to="/contact"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/contact")
                  ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                  : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              اتصل بنا
            </Link>
          </div>

          {/* Section 3: Actions (Login/Dashboard + Theme Toggle) */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Desktop: Login/Dashboard Button */}
            <div className="hidden md:block">
              {user ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  لوحة التحكم
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  تسجيل الدخول
                </Link>
              )}
            </div>

            {/* Theme Toggle - Always Visible */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              aria-label="تبديل الوضع الليلي"
            >
              {isDark ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              aria-label="القائمة"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu - Full Width Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 py-4">
            <div className="flex flex-col space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive("/")
                    ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                الرئيسية
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive("/pricing")
                    ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                الأسعار
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive("/about")
                    ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                حولنا
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive("/contact")
                    ? "text-black dark:text-white bg-gray-100 dark:bg-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                اتصل بنا
              </Link>

              {/* Mobile Login/Dashboard Button */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 mt-2">
                {user ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg text-base font-medium transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
                  >
                    لوحة التحكم
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg text-base font-medium transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
                  >
                    تسجيل الدخول
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
