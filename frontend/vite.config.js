import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin proxy: backend CORS does not allow credentialed cross-origin requests.
    proxy: { "/api": "http://localhost:5000" },
  },
});
