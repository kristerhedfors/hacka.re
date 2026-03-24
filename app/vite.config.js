import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, "..", "");
    return {
        base: "./",
        envDir: "..",
        plugins: [react()],
        define: {
            "import.meta.env.VITE_OPENAI_API_KEY": JSON.stringify(env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || ""),
            "import.meta.env.VITE_OPENAI_API_BASE": JSON.stringify(env.VITE_OPENAI_API_BASE || env.OPENAI_API_BASE || "https://api.openai.com/v1"),
            "import.meta.env.VITE_OPENAI_API_MODEL": JSON.stringify(env.VITE_OPENAI_API_MODEL || env.OPENAI_API_MODEL || "gpt-5"),
        },
    };
});
