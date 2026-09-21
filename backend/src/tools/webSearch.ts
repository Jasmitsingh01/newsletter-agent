import { config } from "../config.js";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  score?: number;
}

export async function searchWeb(
  query: string
): Promise<SearchResult[]> {

  if (!config.tavilyApiKey) {
    throw new Error(
      "TAVILY_API_KEY is missing"
    );
  }

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        api_key: config.tavilyApiKey,

        query,

        search_depth: "advanced",

        max_results: 8,

        include_answer: false,

        include_raw_content: false,

        topic: "news",
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Tavily search failed: ${response.status} ${text}`
    );
  }

  const data = await response.json();

  return data.results || [];
}