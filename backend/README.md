# Newsletter Agent — Backend

Express and LangGraph API for researching, drafting, fact-checking, and delivering newsletters.

## Prerequisites

- Node.js 20 or newer
- Google Chrome or Chromium (used by Puppeteer for browser automation)
- An Ollama API key and a Tavily API key

## Setup

Create `backend/.env` with:

```env
OLLAMA_API_KEY=your_ollama_api_key
TAVILY_API_KEY=your_tavily_api_key
PORT=8000
FRONTEND_URL=http://localhost:5173
```

Then install and start the server:

```bash
npm install
npm run dev
```

The API is available at `http://localhost:8000`. Check it with `GET /health`.

## Commands

```bash
npm run dev      # start the TypeScript development server
npm run build    # type-check and compile to dist/
npm start        # run the compiled server
```

## Delivery behavior

Newsletter generation saves Markdown and HTML files in `output/`. A newsletter is sent only when the frontend calls `POST /api/newsletter/jobs/:jobId/send`. The current delivery provider is a simulator with the subscriber list in `src/tools/emailSimulator.ts`.

