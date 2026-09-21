import {
  createAutonomousGraph,
  createHumanResearchGraph,
  createHumanContinuationGraph,
} from "../agent/graph.js";

import type {
  NewsletterStateType,
} from "../agent/state.js";
import { simulateEmailSend } from "../tools/emailSimulator.js";

import crypto from "node:crypto";

interface Job {
  id: string;

  status:
    | "running"
    | "waiting_for_approval"
    | "completed"
    | "failed";

  state?: NewsletterStateType;

  result?: NewsletterStateType;

  error?: string;

  logs: string[];

  clients: Set<NodeJS.WritableStream>;
}

const jobs =
  new Map<string, Job>();

const autonomousGraph =
  createAutonomousGraph();

const humanResearchGraph =
  createHumanResearchGraph();

const humanContinuationGraph =
  createHumanContinuationGraph();

  function createJob(): Job {

  const id =
    crypto.randomUUID();

  const job: Job = {
    id,

    status: "running",

    logs: [],

    clients: new Set(),
  };

  jobs.set(
    id,
    job
  );

  return job;
}


function broadcast(
  job: Job,
  message: string
) {

  job.logs.push(message);

  const payload =
    JSON.stringify({
      type: "log",
      message,
    });

  for (
    const client of job.clients
  ) {

    try {

      client.write(
        `data: ${payload}\n\n`
      );

    } catch {
      // Client disconnected.
    }
  }
}

function broadcastStatus(
  job: Job,
  status: Job["status"]
) {

  job.status = status;

  const payload =
    JSON.stringify({
      type: "status",
      status,
    });

  for (
    const client of job.clients
  ) {

    try {

      client.write(
        `data: ${payload}\n\n`
      );

    } catch {
      // Client disconnected.
    }
  }
}

export function broadcastBrowserEvent(
  job: Job,
  event: {
    action: string;
    url?: string;
    title?: string;
    query?: string;
    screenshot?: string;
    details?: string;
  }
) {
  const payload = JSON.stringify({
    type: "browser_event",
    ...event,
    timestamp: Date.now(),
  });

  for (const client of job.clients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      // client disconnected
    }
  }
}

const activeJobCallbacks = new Map<string, (event: any) => void>();

export function registerJobBrowserCallback(jobId: string, cb: (event: any) => void) {
  activeJobCallbacks.set(jobId, cb);
}

export function unregisterJobBrowserCallback(jobId: string) {
  activeJobCallbacks.delete(jobId);
}

export function emitBrowserUseEvent(event: any) {
  for (const cb of activeJobCallbacks.values()) {
    try {
      cb(event);
    } catch {
      // ignore
    }
  }
}



export async function runNewsletterAgent(
  goal: string,
  mode:
    | "autonomous"
    | "human" = "autonomous"
) {

  const job =
    createJob();

  broadcast(
    job,
    "Newsletter agent started"
  );

  const initialState = {
    goal,

    mode,

    revisionCount: 0,

    logs: [],
  };

  void executeJob(
    job,
    initialState,
    mode
  );

  return {
    jobId: job.id,

    status:
      mode === "human"
        ? "running"
        : "running",
  };
}
async function executeJob(
  job: Job,
  initialState: any,
  mode:
    | "autonomous"
    | "human"
) {

  registerJobBrowserCallback(job.id, (event) => broadcastBrowserEvent(job, event));

  try {

    if (
      mode === "autonomous"
    ) {

      const stream =
        await autonomousGraph.stream(
          initialState,
          {
            streamMode: "updates",
          }
        );

      let finalState: NewsletterStateType = {
        ...initialState,
      };

      for await (
        const update of stream
      ) {

        const entries =
          Object.entries(
            update
          );

        for (
          const [nodeName, nodeResult]
          of entries
        ) {

          broadcast(
            job,
            `Agent step completed: ${nodeName}`
          );

          finalState = {
            ...finalState,
            ...(nodeResult as any),
          };
        }
      }

      job.result =
        finalState;

      broadcast(
        job,
        "Newsletter agent completed successfully"
      );

      broadcastStatus(
        job,
        "completed"
      );

    } else {

      const stream =
        await humanResearchGraph.stream(
          initialState,
          {
            streamMode: "updates",
          }
        );

      let finalState: NewsletterStateType = {
        ...initialState,
      };

      for await (
        const update of stream
      ) {

        const entries =
          Object.entries(
            update
          );

        for (
          const [nodeName, nodeResult]
          of entries
        ) {

          broadcast(
            job,
            `Agent step completed: ${nodeName}`
          );

          finalState = {
            ...finalState,
            ...(nodeResult as any),
          };
        }
      }

      job.state =
        finalState;

      broadcast(
        job,
        "Waiting for human approval of selected articles"
      );

      broadcastStatus(
        job,
        "waiting_for_approval"
      );
    }

  } catch (error) {

    job.error =
      error instanceof Error
        ? error.message
        : String(error);

    broadcast(
      job,
      `Agent failed: ${job.error}`
    );

    broadcastStatus(
      job,
      "failed"
    );
  }
}


export async function approveNewsletterResearch(
  jobId: string
) {

  const job =
    jobs.get(jobId);

  if (!job) {
    throw new Error(
      "Job not found"
    );
  }

  if (
    job.status !==
    "waiting_for_approval"
  ) {

    throw new Error(
      "Job is not waiting for approval"
    );
  }

  broadcastStatus(job, "running");

  broadcast(
    job,
    "Human approved the selected articles"
  );

  try {
    const streamInput: NewsletterStateType = {
      ...(job.state || {}),
      goal: job.state?.goal || "",
      mode: "human",
    } as any;

    const stream =
      await humanContinuationGraph.stream(
        streamInput,
        {
          streamMode: "updates",
        }
      );

    let finalState: NewsletterStateType = {
      ...streamInput,
    };

    for await (
      const update of stream
    ) {

      const entries =
        Object.entries(
          update
        );

      for (
        const [nodeName, nodeResult]
        of entries
      ) {

        broadcast(
          job,
          `Agent step completed: ${nodeName}`
        );

        finalState = {
          ...finalState,
          ...(nodeResult as any),
        };
      }
    }

    job.result =
      finalState;

    broadcast(
      job,
      "Newsletter completed successfully"
    );

    broadcastStatus(job, "completed");

    return job;

  } catch (error) {

    job.error =
      error instanceof Error
        ? error.message
        : String(error);

    broadcast(
      job,
      `Agent failed: ${job.error}`
    );

    broadcastStatus(job, "failed");

    throw error;
  }
}

export async function refineNewsletterResearch(
  jobId: string,
  feedback: string,
  references?: string[]
) {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "waiting_for_approval") {
    throw new Error("Job is not waiting for approval");
  }

  broadcastStatus(job, "running");

  broadcast(
    job,
    `Human requested research refinement: "${feedback}"`
  );

  try {
    const updatedState: NewsletterStateType = {
      ...(job.state || {}),
      goal: job.state?.goal || "",
      mode: "human",
      userFeedback: feedback,
      userReferences: references || [],
      revisionCount: job.state?.revisionCount || 0,
      logs: [],
    } as any;

    const stream =
      await humanResearchGraph.stream(
        updatedState,
        {
          streamMode: "updates",
        }
      );

    let finalState: NewsletterStateType = {
      ...updatedState,
    };

    for await (
      const update of stream
    ) {
      const entries =
        Object.entries(update);

      for (
        const [nodeName, nodeResult]
        of entries
      ) {
        broadcast(
          job,
          `Agent step completed: ${nodeName}`
        );

        finalState = {
          ...finalState,
          ...(nodeResult as any),
        };
      }
    }

    job.state = finalState;

    broadcast(
      job,
      "Research refined! Waiting for human approval of updated articles"
    );

    broadcastStatus(
      job,
      "waiting_for_approval"
    );

    return job;
  } catch (error) {
    job.error =
      error instanceof Error
        ? error.message
        : String(error);

    broadcast(
      job,
      `Agent failed: ${job.error}`
    );

    broadcastStatus(job, "failed");

    throw error;
  }
}



export function getJob(
  jobId: string
) {

  const job =
    jobs.get(jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,

    status: job.status,

    logs: job.logs,

    result: job.result,

    state:
      job.status ===
      "waiting_for_approval"
        ? job.state
        : undefined,

    error: job.error,
  };
}

export async function sendNewsletterToSubscribers(jobId: string) {
  const job = jobs.get(jobId);
  const newsletter = job?.result?.newsletter;

  if (!job || job.status !== "completed" || !newsletter) {
    throw new Error("A completed newsletter is required before it can be sent");
  }

  const delivery = await simulateEmailSend(newsletter);
  broadcast(job, `Newsletter sent to ${delivery.recipientCount} subscribers`);
  return delivery;
}

export function subscribeToJob(
  jobId: string,
  response: NodeJS.WritableStream
) {

  const job =
    jobs.get(jobId);

  if (!job) {
    throw new Error(
      "Job not found"
    );
  }

  job.clients.add(
    response
  );

  for (
    const log of job.logs
  ) {

    response.write(
      `data: ${JSON.stringify({
        type: "log",
        message: log,
      })}\n\n`
    );
  }

  response.write(
    `data: ${JSON.stringify({
      type: "status",
      status: job.status,
    })}\n\n`
  );
}
