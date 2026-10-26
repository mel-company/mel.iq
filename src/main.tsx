import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { reloadForNewBuild } from "./utils/staleBuild";
import { loadClarity } from "./utils/clarity";

// A chunk from a previous deploy is gone: load the current build instead of
// leaving the page blank. If we just reloaded, the error falls through to
// RouteErrorBoundary, which shows a reload button.
window.addEventListener("vite:preloadError", () => {
  reloadForNewBuild();
});

loadClarity();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401 after refresh is authz / session — retrying only storms /auth/refresh
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing root element");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
