import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  base: "/beta2/",
  plugins: [react()],
  build: {
    outDir: "beta2",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "beta2/index.html")
    }
  }
});
