import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 8000),

ollamaApiKey: process.env.OLLAMA_API_KEY || "",
  tavilyApiKey: process.env.TAVILY_API_KEY || "",

  frontendUrl:
    process.env.FRONTEND_URL || "http://localhost:5173",
};

if (!config.ollamaApiKey) {
  console.warn(
    "WARNING: OLLAMA_API_KEY is not configured."
  );
}

if (!config.tavilyApiKey) {
  console.warn(
    "WARNING: TAVILY_API_KEY is not configured."
  );
}