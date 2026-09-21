# Newsletter Agent — Frontend

React and Vite interface for creating, reviewing, and sending AI-generated newsletters.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API is expected at `http://localhost:8000`.

## Commands

```bash
npm run dev      # start the Vite development server
npm run build    # create a production build
npm run lint     # run ESLint
```

## Workflow

1. Enter a newsletter topic and select a research mode.
2. Start the agent and follow its progress.
3. Review the generated newsletter.
4. Choose **Send to all subscribers** when it is ready. Delivery currently uses the backend's configured mock subscriber list.
