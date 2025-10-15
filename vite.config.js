import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      dedupe: ['react', 'react-dom'],
    },
  },
  build: {
    lib: {
      entry: "src/index.js",
      name: "UserInput",
      fileName: (format) => `user-input.${format}.js`,
    },
    rollupOptions: {
      // 👇 prevent bundling of external dependencies
      external: ["react", "react-dom", "axios", "react-toastify"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          axios: "axios",
          "react-toastify": "ReactToastify",
        },
      },
    },
  },
});
