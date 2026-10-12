import { defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // pdf.js with polyfills, the modern build needs Safari 26.2 (Map.getOrInsertComputed)
  resolve: {
    alias: [
      { find: /^pdfjs-dist$/, replacement: "pdfjs-dist/legacy/build/pdf.mjs" },
      { find: /^pdfjs-dist\/web\//, replacement: "pdfjs-dist/legacy/web/" },
    ],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name(id) {
                if (!id.includes("node_modules")) return null;
                if (id.includes("pdf")) return "pdf";
                if (id.includes("react")) return "react";
                return "vendor";
              },
            },
          ],
        },
      },
    },
  },
  server: {
	port: 3001,
    proxy: {
      "/ui/api": {
		target: process.env.API_URL ?? "http://localhost:3000",
		changeOrigin: true
	  }
    },
  },
});
