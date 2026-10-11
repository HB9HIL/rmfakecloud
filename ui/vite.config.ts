import { defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          "color-functions",
          "global-builtin",
          "import",
          "if-function",
        ],
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
