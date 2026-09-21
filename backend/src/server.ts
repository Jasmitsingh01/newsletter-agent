import express from "express";

import cors from "cors";

import { config } from "./config.js";

import newsletterRouter from "./routes/newsletter.js";

const app =
  express();

app.use(
  cors({
    origin:
      config.frontendUrl,
  })
);

app.use(
  express.json({
    limit: "2mb",
  })
);

app.get(
  "/",
  (_req, res) => {

    res.json({
      name:
        "Newsletter Agent API",

      status:
        "running",

      version:
        "1.0.0",
    });
  }
);

app.get(
  "/health",
  (_req, res) => {

    res.json({
      status: "ok",
    });
  }
);

app.use(
  "/api/newsletter",
  newsletterRouter
);

app.use(
  (
    _req,
    res
  ) => {

    res.status(404).json({
      success: false,
      error: "Route not found",
    });
  }
);

app.listen(
  config.port,
  () => {

    console.log(
      `Newsletter Agent API running on http://localhost:${config.port}`
    );

    console.log(
      `Health: http://localhost:${config.port}/health`
    );
  }
);