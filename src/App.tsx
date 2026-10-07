import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import WebMcpTools from "./components/WebMcpTools";
import ScrollToTop from "./components/ScrollToTop";
import { MarketingShell } from "./components/LandingNavbar";
import Landing from "./pages/Landing";
import { useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { SEO_TOPIC_SLUGS } from "./seo/topics";
import SeoHead from "./seo/SeoHead";

// Heavy / rarely-hit routes stay out of the landing bundle so Slow-4G mobile
// is not paying for Checkout, Dashboard, and the rest on first paint.
const DevProgressPreview = lazy(() => import("./pages/__DevProgressPreview"));
const DevManagePreview = lazy(() => import("./pages/__DevManagePreview"));
const Contact = lazy(() => import("./pages/Contact"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutPaymentReturn = lazy(() => import("./pages/CheckoutPaymentReturn"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const Templates = lazy(() => import("./pages/Templates"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const OTPVerification = lazy(() => import("./pages/Otp"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthRedirectError = lazy(() => import("./pages/AuthRedirectError"));
const PublicTicketChat = lazy(() => import("./pages/PublicTicketChat"));
const SeoTopicPage = lazy(() => import("./pages/seo/SeoTopicPage"));
const SeoGuidesIndex = lazy(() =>
  import("./pages/seo/SeoTopicPage").then((m) => ({ default: m.SeoGuidesIndex })),
);

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

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      <ScrollToTop />
      <WebMcpTools />
      <Toaster />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* No navbar on the auth screens: the frames are standalone, and a
              half-finished sign-in is not somewhere to offer more navigation. */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/otp"
            element={
              <>
                <OTPVerification />
              </>
            }
          />
          <Route
            path="/auth/redirect-error"
            element={
              <>
                <Navbar />
                <AuthRedirectError />
              </>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
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
          <Route path="/__dev/progress" element={<DevProgressPreview />} />
          <Route
            path="/__dev/store/:storeId/manage"
            element={<DevManagePreview />}
          />

          {/* Marketing: only `/` and `/contact`. Old /about + /pricing
              redirect into landing sections so bookmarks still work. */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
          <Route
            path="/contact"
            element={
              <MarketingShell>
                <SeoHead
                  title="تواصل معنا | دعم Mel IQ"
                  description="تواصل مع فريق ميل في العراق للمساعدة في إطلاق متجرك الإلكتروني أو أسئلة الباقات والدعم."
                  path="/contact"
                />
                <Contact />
              </MarketingShell>
            }
          />

          <Route path="/guides" element={<SeoGuidesIndex />} />
          {SEO_TOPIC_SLUGS.map((slug) => (
            <Route
              key={slug}
              path={`/${slug}`}
              element={<SeoTopicPage slug={slug} />}
            />
          ))}
          <Route
            path="/privacy-policy"
            element={
              <MarketingShell>
                <PrivacyPolicy />
              </MarketingShell>
            }
          />
          <Route
            path="/terms-of-use"
            element={
              <MarketingShell>
                <TermsOfUse />
              </MarketingShell>
            }
          />
          <Route
            path="/delete-account"
            element={
              <MarketingShell>
                <DeleteAccount />
              </MarketingShell>
            }
          />
          {/* Standalone, like the other auth screens. */}
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/ticket/:token" element={<PublicTicketChat />} />
          <Route
            path="/checkout/payment-return"
            element={
              <ProtectedRoute>
                <Navbar />
                <CheckoutPaymentReturn />
              </ProtectedRoute>
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
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <NotFound />
              </>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
