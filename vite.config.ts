import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/warranty-check": {
        target: "https://baohanhdientu.sony.com.vn",
        changeOrigin: true,
        secure: true,
        rewrite: (requestPath) =>
          requestPath.replace(
            "/api/warranty-check",
            "/TraCuu/Home/CheckWarranty",
          ),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
