import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  // server: {
  //   proxy: {
  //     "/api/v1": {
  //       target: "http://localhost:3000",
  //       changeOrigin: true,
  //     },
  //   },
  // },
});
