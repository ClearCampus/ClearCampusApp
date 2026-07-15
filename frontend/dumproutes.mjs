import { build } from "vite";
const result = await build({
  logLevel: "silent",
  build: { write: false, rollupOptions: { input: "src/main.tsx" } },
});
