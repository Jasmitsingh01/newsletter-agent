# Newsletter Agent

Newsletter Agent researches current web sources, prepares an AI newsletter, reviews its quality, and lets the user send the approved issue to every configured subscriber.
## Video Preview

<video src="https://github.com/Jasmitsingh01/newsletter-agent/releases/download/v1.0.0/Screencast.from.2026-09-22.02-59-33.webm" controls></video>

[Download the full-resolution demo (117 MB)](https://github.com/Jasmitsingh01/newsletter-agent/releases/download/v1.0.0/Screencast.from.2026-09-22.02-59-33.webm)

A short walkthrough showing the research workflow, live browser automation, human-in-the-loop review, newsletter generation, and delivery flow.

A short walkthrough showing the research workflow, live browser automation, human-in-the-loop review, newsletter generation, and delivery flow.

## Architecture

```text
┌──────────────────────────────┐
│ Frontend                     │
│ React + Vite                 │
│ localhost:5173               │
└───────────────┬──────────────┘
                │ REST requests + Server-Sent Events
┌───────────────▼──────────────┐
│ Backend                      │
│ Express + TypeScript         │
│ localhost:8000               │
│                              │
│ Job manager                  │
│ ├─ tracks job state/logs     │
│ └─ broadcasts live events    │
└───────┬───────────┬──────────┘
        │           │
        │           └──────────────────────────┐
┌───────▼───────────┐              ┌────────────▼────────────┐
│ LangGraph agent   │              │ Browser automation      │
│ planner           │              │ Puppeteer + Chromium    │
│ research          │◄────────────►│ DOM extraction          │
│ rank              │              │ DevTools screencast     │
│ summarize         │              └─────────────────────────┘
│ writer / critic   │
│ revision / output │
└───────┬───────────┘
        │
┌───────▼──────────────────────────┐
│ External and local services      │
│ Ollama (LLM) • Tavily (search)   │
│ Markdown/HTML output • email mock│
└──────────────────────────────────┘
```

## How it works

1. The user enters a newsletter goal in the React application.
2. The frontend creates a backend job with `POST /api/newsletter/run` and opens a Server-Sent Events connection.
3. LangGraph plans search queries, searches the web with Tavily, and opens selected sources in Chromium.
4. Puppeteer extracts article content and emits live Chromium screencast frames, status, and logs to the frontend through SSE.
5. The agent ranks sources, summarizes them, writes the newsletter, and performs a critic/revision cycle. It allows up to two revisions before continuing to output.
6. Markdown and HTML files are created in `backend/output/`.
7. The completed newsletter appears in the frontend. The user must explicitly select **Send to all subscribers**; the backend then calls its delivery provider.

## Agent modes

| Mode | Flow |
| --- | --- |
| Autonomous | Runs planning through output without stopping. |
| Human-in-the-loop | Stops after source ranking so the user can select articles, add feedback or reference URLs, and approve continuation. |

## Main API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/newsletter/run` | Start an autonomous or human-review job. |
| `GET` | `/api/newsletter/jobs/:jobId` | Read job status and result. |
| `GET` | `/api/newsletter/jobs/:jobId/stream` | Receive logs, status, and browser events over SSE. |
| `POST` | `/api/newsletter/jobs/:jobId/approve` | Continue an approved human-review job. |
| `POST` | `/api/newsletter/jobs/:jobId/refine` | Re-run research with feedback and reference URLs. |
| `POST` | `/api/newsletter/jobs/:jobId/send` | Send a completed newsletter to all configured subscribers. |

## Run locally

### 1. Configure the backend

Create `backend/.env`:

```env
OLLAMA_API_KEY=your_ollama_api_key
TAVILY_API_KEY=your_tavily_api_key
PORT=8000
FRONTEND_URL=http://localhost:5173
```

Chrome or Chromium must be installed for browser automation.

### 2. Start both applications

Run each command in a separate terminal:

```bash
cd backend && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. The backend health endpoint is `http://localhost:8000/health`.

## Delivery and generated files

The current delivery implementation is a simulator. Its recipient list lives in `backend/src/tools/emailSimulator.ts`; replace it with a real email provider before production use. Generated newsletter Markdown and HTML files are saved to `backend/output/`.

## Project layout

```text
newsletter-agent/
├── frontend/     React interface and live job UI
├── backend/      Express API, LangGraph workflow, browser tools, delivery
└── README.md     Project overview and architecture
```

For folder-specific commands, see the [frontend README](frontend/README.md) and [backend README](backend/README.md).
