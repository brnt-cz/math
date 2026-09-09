import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

/* Zdroj je v app/, build padá do dist/ v korenu repa — dist se commituje,
   protoze nasazeni je jen nakopirovani souboru na RPi. */
export default defineConfig({
  root: "app",
  base: "./",
  plugins: [vue()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    cssCodeSplit: false,      // jeden CSS soubor, at ho jde inlinovat do Artifactu
    rollupOptions: {
      output: { manualChunks: undefined },   // jeden JS soubor, ze stejneho duvodu
    },
  },
  test: {
    environment: "node",
    include: ["../tests/**/*.test.ts"],
  },
});
