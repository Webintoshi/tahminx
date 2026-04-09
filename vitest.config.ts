import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    include: ["app/**/*.spec.ts?(x)", "components/**/*.spec.ts?(x)", "lib/**/*.spec.ts?(x)"],
    exclude: ["backend/**", "node_modules/**"]
  }
});
